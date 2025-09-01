import Vector, { deg2rad, rad2deg } from '@crhio/vector';


function Bend({
  path = '',
  initialPosition = { x: 0, y: 0 },
  initialDirection = { x: 1, y: 0 },
}) {
  if (!(this instanceof Bend)) {
    return new Bend({ path, initialPosition, initialDirection });
  }

  this.path = path;
  this.initialPosition = Vector(initialPosition);
  this.initialDirection = Vector(initialDirection);
}

const realThreshold = 1e-8;
 
const words = {
  d: ({ instructions, params }) => {
    const radius = params.pop() / 2;
    instructions.unshift({ type: 'barRadius', radius });
    return { instructions, params };
  },
  s: ({ instructions, params }) => {
    const radius = params.pop() / 2;
    instructions.push({ type: 'bendRadius', radius });
    return { instructions, params };
  },
  l: ({ instructions, params }) => {
    const projectedLength = parseFloat(params.pop());
    let length;
    let pivotLength;
    const index = instructions.length - 1;
    if (instructions[index] && instructions[index].type === 'turn') {
      length = projectedLength - instructions[index].shift;
      pivotLength = length;
    }
    if (instructions[index] && instructions[index].type === 'bend') {
      length = projectedLength - instructions[index].lengthToTangent - instructions[index].shift;
      pivotLength = projectedLength - instructions[index].shift;
    }
    instructions.push({
      type: 'forward',
      length: length || projectedLength,
      pivotLength: pivotLength || projectedLength,
      projectedLength,
    });
    return { instructions, params };
  },
  w: ({ instructions, params }) => {
    const angle = params.pop();
    const index = instructions.length - 1;

    // Find bend radius and bar radius, if any
    let barR = 0;
    for (let i = index; i >= 0; i -= 1) {
      if (instructions[i].type === 'barRadius') {
        barR = instructions[i].radius;
        break;
      }
    }

    let bendR = 0;
    for (let i = index; i >= 0; i -= 1) {
      if (instructions[i].type === 'bendRadius') {
        bendR = instructions[i].radius + barR;
        break;
      }
    }
    let angleValue = angle;
    let loopCount = 1;
    if (Math.abs(angle) === 180) {
      loopCount = 2;
      angleValue = angle / 2;
    }

    for (let i = 1; i <= loopCount; i++) {
      //  Bend reduces length of segment by tan(w/2) / radius
      const shift = barR !== 0 ? Math.abs(barR * Math.tan(deg2rad(angleValue / 2))) : 0;
      instructions[index].length -= shift;
      instructions[index].pivotLength -= shift;

      if (bendR === 0) {
        // No bend radius results in a sharp turn
        instructions.push({ type: 'turn', angleValue, shift });
      } else {
        // Bend radius requires modification of neighboring straight segments
        const lengthToTangent = bendR / Math.tan(deg2rad(180 - Math.abs(angleValue)) / 2);
        // console.log('i', i);
        // console.log('barR', barR);
        // console.log('bendR', bendR);
        // console.log('angle', angle);
        // console.log('angleValue', angleValue);
        // console.log('lengthToTangent', lengthToTangent);
        instructions[index].length -= lengthToTangent;
        instructions.push({
          type: 'bend', angle: angleValue, lengthToTangent, shift, radius: bendR,
        });
      }
      if (loopCount === 2 && i === 1) {
        const radius = bendR - barR;
        instructions.push({ type: 'bendRadius', radius });
        const lengthToTangent = bendR / Math.tan(deg2rad(180 - Math.abs(angleValue)) / 2);
        const length = radius - lengthToTangent - shift;
        const pivotLength = radius - shift;

        instructions.push({
          type: 'forward',
          length: length || radius,
          pivotLength: pivotLength || radius,
          radius,
        });
      }
    }
    console.log('instructions', instructions);
    return { instructions, params };
  },
  div: ({ instructions, params }) => {
    const d = params.pop();
    const n = params.pop();
    params.push(n / d);
    return { instructions, params };
  },
  atan: ({ instructions, params }) => {
    const p = params.pop();
    params.push(rad2deg(Math.atan(p)));
    return { instructions, params };
  },
  neg: ({ instructions, params }) => {
    const p = params.pop();
    params.push(-p);
    return { instructions, params };
  },
};

const draw = {
  barRadius: ({ pen, instruction }) => ({
    pen: { ...pen, barRadius: instruction.radius },
    commands: null,
  }),
  bendRadius: ({ pen, instruction }) => ({
    pen: { ...pen, bendRadius: instruction.radius },
    commands: null,
  }),
  forward: ({ pen, instruction }) => {
    const position = pen.position
      .add(pen.direction.scale(instruction.length));
    return {
      pen: { ...pen, position },
      commands: [{ type: 'lineto', params: [position.x, position.y] }],
    };
  },
  bend: ({ pen, instruction }) => {
    const bendR = pen.bendRadius || 0;
    const barR = pen.barRadius || 0;
    const r = bendR + barR;
    const direction = pen.direction.rotateDeg(instruction.angle);
    const position = pen.position
      .add(pen.direction.scale(instruction.lengthToTangent))
      .add(direction.scale(instruction.lengthToTangent));
    const sf = instruction.angle > 0 ? 1 : 0;
    const l = Vector(pen.position).dist(position) / 2;
    const sagitta = r - Math.sqrt(r * r - l * l);
    const sSign = sf === 1 ? 1 : -1;
    return {
      pen: { ...pen, position, direction },
      commands: [{
        type: 'arcto',
        params: [position.x, position.y, sSign * (sagitta / l)],
        svgParams: [r, r, 0, 0, sf, position.x, position.y],
      }],
    };
  },
  turn: ({ pen, instruction }) => ({
    pen: { ...pen, direction: pen.direction.rotateDeg(instruction.angle) },
    commands: null,
  }),
};

const drawProjected = {
  ...draw,
  forward: ({ pen, instruction }) => {
    const position = pen.position
      .add(pen.direction.scale(instruction.pivotLength));
    return {
      pen: { ...pen, position },
      commands: [{ type: 'lineto', params: [position.x, position.y] }],
    };
  },
  bend: ({ pen, instruction }) => ({
    pen: { ...pen, direction: pen.direction.rotateDeg(instruction.angle) },
    commands: null,
  }),
};

const cmdPt = ({ type, params }) => {
  switch (type) {
    default:
      return { x: params[0], y: params[1] };
  }
};

const invertParams = ({ type, params: p, svgParams: sp }) => {
  const params = p.slice();
  params.splice(1, 1, -p[1]);

  if (type === 'arcto') {
    return {
      type,
      params: [p[0], -p[1], -p[2]],
      svgParams: [sp[0], sp[1], sp[2], sp[3], sp[4] ? 0 : 1, sp[5], -sp[6]],
    };
  }
  return {
    type,
    params,
  };
};

const fuzzyEqual = (x, y, epsilon = realThreshold) => Math.abs(x - y) < epsilon;

const fuzzyEqualPt = (ptA, ptB, epsilon = realThreshold) => fuzzyEqual(ptA.x, ptB.x, epsilon)
  && fuzzyEqual(ptA.y, ptB.y, epsilon);

const ptIsOnSegment = ([{ x: x1, y: y1 }, { x: x2, y: y2 }], { x, y }) => {
  const dxc = x - x1;
  const dyc = y - y1;

  const dxl = x2 - x1;
  const dyl = y2 - y1;

  const cross = dxc * dyl - dyc * dxl;
  const isOnLine = fuzzyEqual(cross, 0);

  const xIsOnSegment = x1 < x2
    ? x1 <= x && x <= x2
    : x2 <= x && x <= x1;

  const yIsOnSegment = y1 < y2
    ? y1 < y && y <= y2
    : y2 <= y && y <= y1;

  return isOnLine && xIsOnSegment && yIsOnSegment;
};

const segmentsAreColinear = (segA, segB) => {
  const line = [segA[0], segB[1]];
  return ptIsOnSegment(line, segA[1]) && ptIsOnSegment(line, segB[0]);
};

const instructionsToPath = (instructions) => {
  const list = instructions.map(({ type, params }) => `${params.join(' ')} ${type}`);
  return list.join(' ');
};

const verticesToPath = (vertices, d = 0, s = 0) => {
  const instructions = [
    { type: 'd', params: [d] },
    { type: 's', params: [s] },
  ];

  let angleA = 0;
  let angleB = 0;
  let segA = 0;
  let segB = 0;
  let shift = 0;

  for (let i = 1; i < vertices.length; i += 1) {
    const vec = Vector(vertices[i]).subtract(vertices[i - 1]);

    segA = vec.magnitude();
    angleA = vec.angleDeg();

    const angle = i === 1 ? 0 : angleA - angleB;
    shift = d !== 0 ? Math.abs((d / 2) * Math.tan(deg2rad(angle / 2))) : 0;
    segA += shift;
    segB += shift;

    // Add preceding straight segment
    if (i > 1) {
      instructions.push({ type: 'l', params: [segB] });

      // Add bend segment
      if (angle !== 0) {
        instructions.push({ type: 'w', params: [angle] });
      }
    }

    // if last vertex, add final straight segment
    if (i === vertices.length - 1) {
      instructions.push({ type: 'l', params: [segA] });
    }

    // rotate segments
    segB = segA;
    angleB = angleA;
  }

  return instructionsToPath(instructions);
};

Bend.prototype.list = function list() {
  return this.path.split(' ');
};

// A structured form of the 'path' property
Bend.prototype.instructionList = function instructionList() {
  const stack = {
    instructions: [],
    params: [],
  };

  this.list().forEach((arg) => {
    if (words[arg]) {
      stack.instructions.push({ type: arg, params: stack.params });
      stack.params = [];
    } else {
      stack.params.push(arg);
    }
  });

  return stack.instructions;
};

// The path object, minus bend radius & diameter commands
Bend.prototype.stepPath = function stepPath() {
  const list = this.instructionList();

  const stepsOnly = list.filter(item => !['d', 's'].includes(item.type));

  return instructionsToPath(stepsOnly);
};

// The instruction list, computing vertices from bends
Bend.prototype.instructions = function instructions() {
  let stack = {
    instructions: [],
    params: [],
  };

  this.list().forEach((arg) => {
    if (words[arg]) {
      stack = words[arg](stack);
    } else {
      stack.params.push(arg);
    }
  });

  return stack.instructions;
};

// Path instructions translated into commands that map
// onto SVG path commands
Bend.prototype.commands = function commands() {
  let pen = {
    position: this.initialPosition,
    direction: this.initialDirection,
  };

  let cmds = [{ type: 'moveto', params: [pen.position.x, pen.position.y] }];

  this.instructions().forEach((instruction) => {
    const { pen: newPen, commands: newCommands } = draw[instruction.type]({ pen, instruction });
    if (newCommands) cmds = cmds.concat(newCommands);
    pen = newPen;
  });

  return cmds;
};

// A list of commands, using the projected (i.e., non-radiused) vertices
Bend.prototype.projectedCommands = function lengths() {
  let pen = {
    position: this.initialPosition,
    direction: this.initialDirection,
  };

  let cmds = [{ type: 'moveto', params: [pen.position.x, pen.position.y] }];

  this.instructions().forEach((instruction) => {
    const { pen: newPen, commands: newCommands } = drawProjected[instruction.type]({ pen, instruction });
    if (newCommands) cmds = cmds.concat(newCommands);
    pen = newPen;
  });

  return cmds;
};

// A list of segments, converting bend instructions into arcs and lines
Bend.prototype.segments = function segments({ invertY = false } = {}) {
  const commands = invertY
    ? this.commands().map(command => invertParams(command))
    : this.commands();

  let prev = cmdPt(commands[0]);
  const segs = [];
  commands.slice(1).forEach((cmd) => {
    const next = cmdPt(cmd);
    const translation = Vector(next).subtract(prev);
    const midpoint = Vector(prev).add(translation.scale(0.5));
    segs.push({ type: cmd.type, points: [prev, next], midpoint });
    prev = { x: next.x, y: next.y };
  });

  return segs;
};

// A list of segments using the projected vertices
Bend.prototype.projectedSegments = function projectedSegments({ invertY = false } = {}) {
  const commands = invertY
    ? this.projectedCommands().map(command => invertParams(command))
    : this.projectedCommands();

  let prev = cmdPt(commands[0]);
  const segs = [];
  commands.slice(1).forEach((cmd) => {
    const next = cmdPt(cmd);
    const translation = Vector(next).subtract(prev);
    const midpoint = Vector(prev).add(translation.scale(0.5));
    segs.push({ type: cmd.type, points: [prev, next], midpoint });
    prev = { x: next.x, y: next.y };
  });

  return segs;
};

// A list of the projected vertices
Bend.prototype.vertices = function vertices() {
  const segments = this.projectedSegments();
  const v = segments
    .map(segment => segment.points[0]);

  const lastSegment = segments[segments.length - 1];

  if (!fuzzyEqualPt(v[0], lastSegment.points[1])) {
    v.push(lastSegment.points[1]);
  }

  return v;
};

// A list of the 'inner' vertices (excluding endpoints)
Bend.prototype.innerVertices = function innerVertices() {
  const segments = this.projectedSegments();
  segments.pop();
  return segments.map(segment => segment.points[1]);
};

// A list of the 'bend' instructions
Bend.prototype.bendInstructions = function bendInstructions() {
  const instructions = this.instructionList();

  return instructions.filter(instruction => instruction.type === 'w');
};

// A list of operations performed to fabricate the shape from a single bar
Bend.prototype.steps = function steps() {
  return this.instructions().reduce((s, instruction) => {
    if (instruction.type === 'forward') {
      s.push({
        length: instruction.projectedLength,
        termination: 'cut',
      });
    } else if (['bend', 'turn'].includes(instruction.type)) {
      const lastStep = s[s.length - 1];
      const firstStep = s[0];
      lastStep.termination = 'bend';
      lastStep.sign = Math.sign(instruction.angle);
      lastStep.angle = Math.abs(instruction.angle);
      const isTurn = firstStep && firstStep.termination === 'bend' && firstStep.sign !== lastStep.sign;
      lastStep.turn = !!isTurn;
    }

    return s;
  }, []);
};

// The overall length of the shape, accounting for arc lengths of bend segments
Bend.prototype.length = function length() {
  return this.instructions().reduce((s, instruction) => {
    if (instruction.type === 'forward') return s + instruction.length;
    if (instruction.type === 'bend') {
      return s + Math.abs(instruction.radius * deg2rad(instruction.angle));
    }
    return s;
  }, 0);
};

Bend.prototype.bend = function bend(index, t, angle) {
  const instructions = this.instructionList();

  // Find index of instruction to replace
  const replacedInstruction = instructions
    .filter(i => i.type === 'l')[index];
  const instructionIndex = instructions.indexOf(replacedInstruction);

  // Find distance along segment to bend
  const segLength = parseFloat(replacedInstruction.params[0]);
  const l1 = t * segLength;
  const l2 = segLength - l1;

  // Split straight segment into two, and insert new turn
  instructions.splice(
    instructionIndex,
    1,
    { type: 'l', params: [l1] },
    { type: 'w', params: [angle] },
    { type: 'l', params: [l2] },
  );

  // Create new Bend object
  return new Bend({
    path: instructionsToPath(instructions),
    initialPosition: this.initialPosition,
    initialDirection: this.initialDirection,
  });
};

Bend.prototype.toggleBend = function toggleBend(index) {
  // Find bend to toggle
  const instructions = this.instructionList();
  const bends = instructions.filter(instruction => instruction.type === 'w');
  const bend = bends[index];
  const instructionIndex = instructions.indexOf(bend);
  const oldAngle = parseFloat(bend.params[0]);

  // Create new bend to replace it
  let angle;
  if (oldAngle > 0) {
    angle = -90;
  } else if (oldAngle < 0) {
    angle = 0;
  } else {
    angle = 90;
  }

  // Replace existing bend with new bend
  instructions[instructionIndex].params[0] = angle;

  // Create new Bend object
  return new Bend({
    path: instructionsToPath(instructions),
    initialPosition: this.initialPosition,
    initialDirection: this.initialDirection,
  });
};

Bend.prototype.isBendStraight = function isBendStraight(index) {
  const instructions = this.instructionList();
  const bends = instructions.filter(instruction => instruction.type === 'w');
  const bend = bends[index];
  return parseFloat(bend.params[0]) === 0;
};

Bend.prototype.removeBend = function removeBend(index) {
  // Find bend to remove
  const instructions = this.instructionList();
  const bends = instructions.filter(instruction => instruction.type === 'w');
  const bend = bends[index];
  const instructionIndex = instructions.indexOf(bend);

  // Join surrounding segments
  const s1 = instructions[instructionIndex - 1];
  const s2 = instructions[instructionIndex + 1];

  const s1Length = s1.type === 'l' ? parseFloat(s1.params[0]) : 0;
  const s2Length = s2.type === 'l' ? parseFloat(s2.params[0]) : 0;

  let segs;
  let i;
  let rem;
  if (s1 && s2) {
    segs = [{ type: 'l', params: [s1Length + s2Length] }];
    i = instructionIndex - 1;
    rem = 3;
  } else if (s1) {
    segs = [s1];
    i = instructionIndex - 1;
    rem = 2;
  } else if (s2) {
    segs = [s2];
    i = instructionIndex;
    rem = 2;
  } else {
    segs = [];
    i = instructionIndex;
    rem = 1;
  }

  // Replace segments
  instructions.splice(i, rem, ...segs);

  // Create new Bend object
  return new Bend({
    path: instructionsToPath(instructions),
    initialPosition: this.initialPosition,
    initialDirection: this.initialDirection,
  });
};

Bend.prototype.setSegmentLength = function setSegmentLength(index, length) {
  // Find straight segment to modify
  const instructions = this.instructionList();
  const segments = instructions.filter(instruction => instruction.type === 'l');
  const segment = segments[index];
  const instructionIndex = instructions.indexOf(segment);

  // Replace length property in that segment
  instructions[instructionIndex].params[0] = length;

  // Create new Bend object
  return new Bend({
    path: instructionsToPath(instructions),
    initialPosition: this.initialPosition,
    initialDirection: this.initialDirection,
  });
};

Bend.prototype.setBendAngle = function setBendAngle(index, angle) {
  // Find bend to modify
  const instructions = this.instructionList();
  const bends = instructions.filter(instruction => instruction.type === 'w');
  const bend = bends[index];
  const instructionIndex = instructions.indexOf(bend);

  // Replace angle property in that instruction
  instructions[instructionIndex].params[0] = angle;

  // Create new Bend object
  return new Bend({
    path: instructionsToPath(instructions),
    initialPosition: this.initialPosition,
    initialDirection: this.initialDirection,
  });
};

Bend.prototype.reverse = function reverse() {
  const segments = this.projectedSegments();
  const lastSegment = segments[segments.length - 1];
  const lastPt = lastSegment.points[1];
  const direction = Vector(lastSegment.points[0])
    .subtract(lastSegment.points[1])
    .normalize();
  const instructions = this.instructionList()
    .reverse()
    .map(({ type, params }) => ({ type, params: type === 'w' ? [-parseFloat(params[0])] : params }));
  const iType = i => (['d', 's'].includes(i.type) ? 'a' : 'b');
  const ranges = instructions.reduce((r, i) => {
    if (r.length === 0) {
      r.push([i]);
      return r;
    }

    const lastI = r[r.length - 1][0];
    if (iType(i) === iType(lastI)) {
      r[r.length - 1].push(i);
    } else {
      r.push([i]);
    }

    return r;
  }, []);

  for (let i = 0; i < ranges.length; i += 1) {
    const r = ranges[i];
    if (iType(r[0]) === 'a') {
      // Swap positions of d/s commands
      ranges[i] = ranges[i - 1];
      ranges[i - 1] = r;
    }
  }

  const merged = [].concat(...ranges);

  return new Bend({
    path: instructionsToPath(merged),
    initialPosition: lastPt,
    initialDirection: direction,
  });
};

Bend.prototype.join = function join(bend, endpointA = 'end', endpointB = 'start') {
  const a = endpointA === 'end' ? this : this.reverse();
  const b = endpointB === 'start' ? bend : bend.reverse();

  const aVertices = a.vertices();
  const aLastSeg = [aVertices[aVertices.length - 2], aVertices[aVertices.length - 1]];
  const bVertices = b.vertices();
  const bFirstSeg = [bVertices[0], bVertices[1]];

  const endpointsCoincide = fuzzyEqualPt(aVertices[aVertices.length - 1], bVertices[0]);
  const areColinear = segmentsAreColinear(aLastSeg, bFirstSeg);

  if (endpointsCoincide && !areColinear) {
    aVertices.pop();
  } else if (areColinear) {
    aVertices.pop();
    bVertices.shift();
  }

  const aInstructions = a.instructionList();
  const vertices = aVertices.concat(bVertices);
  const dInstruction = aInstructions.find(i => i.type === 'd');
  const d = dInstruction ? dInstruction.params[0] : 0;
  const sInstruction = aInstructions.find(i => i.type === 's');
  const s = sInstruction ? sInstruction.params[0] : 0;

  return new Bend({
    path: verticesToPath(vertices, d, s),
    initialPosition: aVertices[0],
    initialDirection: a.initialDirection,
  });
};

Bend.prototype.print = function print({ invertY = false } = {}) {
  const cmds = {
    moveto: 'M',
    lineto: 'L',
    arcto: 'A',
  };

  return this.commands()
    .map((command) => {
      let cmd = command;

      if (invertY) {
        cmd = invertParams(command);
      }

      const svgParams = cmd.type === 'arcto' ? cmd.svgParams : cmd.params;

      return [cmds[command.type], ...svgParams].join(' ');
    }).join(' ');
};

export default function (init) {
  return new Bend(init);
}
