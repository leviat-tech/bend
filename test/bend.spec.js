import chai from 'chai';
import Bend from '../src/bend';


chai.expect();
const { expect } = chai;

describe('bend', () => {
  const b1 = Bend({ path: '5 l 90 w 5 l 45 w 5 l' });
  const b2 = Bend({ path: '2 s 5 l 90 w 5 l 45 w 5 l -135 w 5 l' });
  const b3 = Bend({ path: '10 d 20 s 100 l 60 150 div atan w 150 l 60 150 div atan neg w 125 l' });
  const b4 = Bend({ path: '8 d 16 s 240 l 40 w 174 l -40 w 240 l' });
  const b5 = Bend({ path: '0 d 0 s 40 l 45 w 30 l -90 w 30 l 90 w 30 l 90 w 30 l' });
  const b6 = Bend({ path: '6 d 6 s 40 l 45 w 30 l -90 w 30 l 90 w 30 l 90 w 30 l' });

  it('should report the correct drawing instructions', () => {
    expect(b1.instructions().length).to.eql(5);
  });

  it('should draw the correct SVG path', () => {
    expect(b1.print()).to.eql('M 0 0 L 5 0 L 5 5 L 1.4644660940672627 8.535533905932738');
  });

  it('should allow radiused bends', () => {
    expect(b2.print()).to.eql('M 0 0 L 4 0 A 1 1 0 0 1 5 1.0000000000000002 L 5 4.585786437626905 A 1 1 0 0 1 4.707106781186548 5.292893218813452 L 3.17157287525381 6.82842712474619 A 1 1 0 0 0 3.878679656440358 8.535533905932738 L 6.464466094067263 8.535533905932738');
  });

  it('should understand div, atan, and neg', () => {
    expect(b3.print()).to.eql('M 0 0 L 96.14835192865496 0 A 15 15 0 0 1 101.71921207396652 1.0728496367211107 L 233.83838479528134 53.92051872524704 A 15 15 0 0 0 239.4092449405929 54.99336836196815 L 360.55759686924785 54.99336836196815');
  });

  it('should correctly determine lengths of individual segments', () => {
    expect(b5.print()).to.eql('M 0 0 L 40 0 L 61.21320343559643 21.213203435596423 L 82.42640687119285 -3.552713678800501e-15 L 103.63961030678928 21.21320343559642 L 82.42640687119285 42.426406871192846');
    expect(b6.print()).to.eql('M 0 0 L 36.27207793864215 0 A 6 6 0 0 1 40.51471862576143 1.7573593128807148 L 52.72792206135786 13.970562748477139 A 6 6 0 0 0 61.21320343559643 13.97056274847714 L 69.698484809835 5.4852813742385695 A 6 6 0 0 1 78.18376618407358 5.4852813742385695 L 86.66904755831214 13.970562748477139 A 6 6 0 0 1 86.66904755831214 22.45584412271571 L 71.81980515339464 37.30508652763321');
  });

  it('should be able to return the segments of a path', () => {
    const b1segs = b1.segments();
    expect(b1segs[0].points).to.eql([{ x: 0, y: 0 }, { x: 5, y: 0 }]);
    const b2segs = b2.segments();
    expect(b2segs[2].midpoint.y).to.eql(2.792893218813453);
  });

  it('should be able to return the manufacturing steps', () => {
    const b1steps = b1.steps();
    const b3steps = b3.steps();
    expect(b1steps[0]).to.eql({
      length: 5, termination: 'bend', sign: 1, angle: 90, turn: false,
    });
    expect(b3steps[1]).to.eql({
      length: 150,
      termination: 'bend',
      sign: -1,
      angle: 21.80140948635181,
      turn: true,
    });
  });

  it('should report the svg commands for a given bend', () => {
    expect(b1.commands().length).to.eql(4);
    expect(b1.commands()[0]).to.eql({ type: 'moveto', params: [0, 0] });
    expect(b1.commands()[3]).to.eql({
      type: 'lineto',
      params: [
        1.4644660940672627,
        8.535533905932738],
    });
  });

  it('should be able to compute the overall developed length of the bend', () => {
    expect(b1.length()).to.eql(15);
    expect(b2.length()).to.eql(17.05553473089231);
    expect(b3.length()).to.eql(371.0085990279908);
  });

  it('should correctly compute the sagitta property for a bend', () => {
    expect(b2.commands()[2].params[2]).to.eql(0.4142135623730951);
  });

  it('should set the sagitta to the proper +/- value', () => {
    const commands = b4.commands();
    expect(commands[2].params[2]).to.eql(0.17632698070846461);
    expect(commands[4].params[2]).to.eql(-0.17632698070846428);
  });

  it('should allow creation of a bend at an arbitrary position', () => {
    const bend = Bend({ path: '1 d 1 s 5 l 90 w 5 l 45 w 5 l' })
      .bend(1, 0.5, 30);

    expect(bend.path).to.eql('1 d 1 s 5 l 90 w 2.5 l 30 w 2.5 l 45 w 5 l');
  });

  it('should allow a bend vertex to be toggled', () => {
    const bend = Bend({ path: '1 d 1 s 5 l 90 w 5 l 45 w 5 l' })
      .toggleBend(1);

    expect(bend.path).to.eql('1 d 1 s 5 l 90 w 5 l -90 w 5 l');
  });

  it('should allow a vertex to be tested if it is straight', () => {
    const bend = Bend({ path: '1 d 1 s 5 l 90 w 5 l 0 w 5 l' });

    expect(bend.isBendStraight(0)).to.eql(false);
    expect(bend.isBendStraight(1)).to.eql(true);
  });

  it('should allow a vertex to be removed', () => {
    const bend = Bend({ path: '1 d 1 s 5 l 90 w 5 l 0 w 5 l' })
      .removeBend(1);

    expect(bend.path).to.eql('1 d 1 s 5 l 90 w 10 l');
  });

  it('should allow the length of a segment to be modified', () => {
    const bend = Bend({ path: '1 d 1 s 5 l 90 w 5 l 0 w 5 l' })
      .setSegmentLength(0, 8);

    expect(bend.path).to.eql('1 d 1 s 8 l 90 w 5 l 0 w 5 l');
  });

  it('should allow an angle to be modified', () => {
    const bend = Bend({ path: '1 d 1 s 5 l 90 w 5 l 0 w 5 l' })
      .setBendAngle(0, 45);

    expect(bend.path).to.eql('1 d 1 s 5 l 45 w 5 l 0 w 5 l');
  });
});
