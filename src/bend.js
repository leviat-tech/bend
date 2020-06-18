import Vector from '@crhio/vector';


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

function deg2rad(deg) {
  return deg * (Math.PI / 180);
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
    let length = params.pop();
    const index = instructions.length - 1;
    if (instructions[index] && instructions[index].type === 'bend') {
      length -= instructions[index].lengthToTangent;
    }
    instructions.push({ type: 'forward', length });
    return { instructions, params };
  },
  w: ({ instructions, params }) => {
    const angle = params.pop();
    const index = instructions.length - 1;

    // Find bend radius, if any
    let br = 0;
    for (let i = index; i >= 0; i -= 1) {
      if (instructions[i].type === 'bendRadius') {
        br = instructions[i].radius;
        break;
      }
    }

    if (br === 0) {
      // No bend radius results in a sharp turn
      instructions.push({ type: 'turn', angle });
    } else {
      // Bend radius requires modification of neighboring straight segments
      const lengthToTangent = br / Math.tan(deg2rad(180 - Math.abs(angle)) / 2);
      instructions[index].length -= lengthToTangent;
      instructions.push({ type: 'bend', angle, lengthToTangent });
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
    params.push(Math.atan(p));
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
    const r = pen.bendRadius;
    const direction = pen.direction.rotateDeg(-instruction.angle);
    const position = pen.position
      .add(pen.direction.scale(instruction.lengthToTangent))
      .add(direction.scale(instruction.lengthToTangent));
    const sf = -instruction.angle > 0 ? 1 : 0;
    return {
      pen: { ...pen, position, direction },
      commands: [{ type: 'arcto', params: [r, r, 0, 0, sf, position.x, position.y] }],
    };
  },
  turn: ({ pen, instruction }) => ({
    pen: { ...pen, direction: pen.direction.rotateDeg(-instruction.angle) },
    commands: null,
  }),
};

const cmdPt = ({ type, params }) => {
  switch (type) {
    case 'arcto':
      return { x: params[5], y: params[6] };
    default:
      return { x: params[0], y: params[1] };
  }
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

Bend.prototype.segments = function segments() {
  const commands = this.commands();

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

Bend.prototype.print = function print() {
  const cmds = {
    moveto: 'M',
    lineto: 'L',
    arcto: 'A',
  };

  return this.commands()
    .map(command => [cmds[command.type], ...command.params].join(' ')).join(' ');
};

export default function (init) {
  return new Bend(init);
}
