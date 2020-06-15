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
    expect(b3.print()).to.eql('M 0 0 L 99.96679443243097 0 A 10 10 0 0 0 100.03320483532147 -0.00022051951204667822 L 249.96348737199781 -0.9959355238454375 A 10 10 0 0 1 250.02989777488833 -0.9961560433574842 L 374.9966922073193 -0.9961560433574842');
  });
});
