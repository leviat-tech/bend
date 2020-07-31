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

Bend.prototype.length = function length() {
  return this.instructions().reduce((s, instruction) => {
    if (instruction.type === 'forward') return s + instruction.length;
    if (instruction.type === 'bend') {
      return s + Math.abs(instruction.radius * deg2rad(instruction.angle));
    }
    return s;
  }, 0);
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
