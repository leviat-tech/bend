# Bend

A basic implementation of a stack machine for 2D rebar bend paths, inspired by the "BVBS" rebar bend format. 

Bend paths are described in postfix notation:
```
8 d 16 s 240 l 40 w 100 l -10 w 138 l -90 w 115 l
```

The following words are understood:

- `d`: bar diameter
- `s`: bend diameter
- `l`: straight length
- `w`: bend angle, in degrees
- `div`: divide
- `atan`: arctangent
- `neg`: negative

So to compute the rebar bends for [shape 26](https://www.brcå.ltd.uk/downloads/dl/file/id/132/product/0/bs_8666_reinforcement_shape_codes.pdf), you could describe it as follows:

```js
import Bend from '@crhio/bend';

// Assuming A = 100, B = 150, C = 125, D = 60

const bend = Bend({
  path: '10 d 20 s 100 l 60 150 div atan w 150 l 60 150 div atan neg w 125 l'
});

bend.print();
// M 0 0 L 99.96679443243097 0 A 10 10 0 0 0 100.03320483532147 -0.00022051951204667822 L 249.96348737199781 -0.9959355238454375 A 10 10 0 0 1 250.02989777488833 -0.9961560433574842 L 374.9966922073193 -0.9961560433574842
```

A diagram of how the path is computed:
![Path Diagram](https://github.com/obe-de/bend/blob/master/example.png)

Additionally:
- Webpack 3 based.
- ES6 as a source.
- Exports in a [umd](https://github.com/umdjs/umd) format
- ES6 test setup with [Mocha](http://mochajs.org/)

## Scripts

- `yarn build` - produces production version of the library under the `lib` folder
- `yarn dev` - produces development version of the library and runs a watcher
- `yarn test` - well ... it runs the tests :)
- `yarn test:watch` - same as above but in a watch mode
