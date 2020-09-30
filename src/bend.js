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
    const index = instructions.length - 1;
    if (instructions[index] && instructions[index].type === 'turn') {
      length = projectedLength - instructions[index].shift;
    }
    if (instructions[index] && instructions[index].type === 'bend') {
      length = projectedLength - instructions[index].lengthToTangent - instructions[index].shift;
    }
    instructions.push({
      type: 'forward',
      length: length || projectedLength,
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

    //  Bend reduces length of segment by tan(w/2) / radius
    const shift = barR !== 0 ? Math.abs(barR * Math.tan(deg2rad(angle / 2))) : 0;
    instructions[index].length -= shift;

    if (bendR === 0) {
      // No bend radius results in a sharp turn
      instructions.push({ type: 'turn', angle, shift });
    } else {
      // Bend radius requires modification of neighboring straight segments
      const lengthToTangent = bendR / Math.tan(deg2rad(180 - Math.abs(angle)) / 2);
      instructions[index].length -= lengthToTangent;
      instructions.push({
        type: 'bend', angle, lengthToTangent, shift, radius: bendR,
      });
    }

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
      .add(pen.direction.scale(instruction.projectedLength));
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

function ptEqual(ptA, ptB) {
  return ptA.x === ptB.x
    && ptA.y === ptB.y;
}

// A list of the projected vertices
Bend.prototype.vertices = function vertices() {
  const segments = this.projectedSegments();
  const v = segments
    .map(segment => segment.points[0]);

  const lastSegment = segments[segments.length - 1];

  if (!ptEqual(v[0], lastSegment.points[1])) {
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

function instructionsToPath(instructions) {
  const list = instructions.map(({ type, params }) => `${params.join(' ')} ${type}`);
  return list.join(' ');
}

Bend.prototype.bend = function bend(index, t, angle) {
  const segments = this.projectedSegments();
  const instructions = this.instructionList();
  const segment = segments[index];

  // Find index of instruction to replace
  const replacedInstruction = instructions
    .filter(i => i.type === 'l')[index];
  const instructionIndex = instructions.indexOf(replacedInstruction);

  // Find distance along segment to bend
  const segLength = Vector(segment.points[0]).dist(segment.points[1]);
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
