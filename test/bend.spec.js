import chai from 'chai';
import Bend from '../src/bend';


chai.expect();
const { expect } = chai;

describe('bend', () => {
  const b1 = Bend({ path: '5 l 90 w 5 l 45 w 5 l' });
  const b2 = Bend({ path: '2 s 5 l 90 w 5 l 45 w 5 l -135 w 5 l' });
  const b3 = Bend({ path: '10 d 20 s 100 l 60 150 div atan w 150 l 60 150 div atan neg w 125 l' });

  it('should report the correct drawing instructions', () => {
    expect(b1.instructions().length).to.eql(5);
  });

  it('should draw the correct SVG path', () => {
    expect(b1.print()).to.eql('M 0 0 L 5 0 L 5 -5 L 1.4644660940672627 -8.535533905932738');
  });

  it('should allow radiused bends', () => {
    expect(b2.print()).to.eql('M 0 0 L 4 0 A 1 1 0 0 0 5 -1.0000000000000002 L 5 -4.585786437626905 A 1 1 0 0 0 4.707106781186548 -5.292893218813452 L 3.17157287525381 -6.82842712474619 A 1 1 0 0 1 3.878679656440358 -8.535533905932738 L 6.464466094067263 -8.535533905932738');
  });

  it('should understand div, atan, and neg', () => {
    expect(b3.print()).to.eql('M 0 0 L 98.07417596432748 0 A 10 10 0 0 0 101.78808272786851 -0.7152330911474072 L 237.48342090492037 -54.99336836196815 A 10 10 0 0 1 241.1973276684614 -55.708601453115556 L 364.2715036327889 -55.708601453115556');
  });

  it('should be able to return the segments of a path', () => {
    const b1segs = b1.segments();
    expect(b1segs[0].points).to.eql([{ x: 0, y: 0 }, { x: 5, y: 0 }]);
    const b2segs = b2.segments();
    expect(b2segs[2].midpoint.y).to.eql(-2.792893218813453);
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
        -8.535533905932738],
    });
  });
});
