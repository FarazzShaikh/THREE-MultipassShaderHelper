<br />
<p align="center">
  <h1 align="center"><sup>THREE</sup>Multipass Shader Helper</h1>

  <p align="center">
    Create multi-pass shaders in ThreeJS, intuitively.
    <br />
    <a href="https://farazzshaikh.github.io/THREE-MultipassShaderHelper/example/index.html">View Demo</a>
    ·
    <a href="https://github.com/FarazzShaikh/THREE-MultipassShaderHelper/issues/new">Report Bug</a>
  </p>
  <p align="center">
    <a href="https://www.npmjs.com/package/three-multipass-shader-helper"><img align="center" src="https://img.shields.io/npm/v/three-multipass-shader-helper?color=cc3534&style=for-the-badge" /></a>
  </p>
</p>

## Install

### Ndoe

```bash
npm install three-multipass-shader-helper
# or
yarn add three-multipass-shader-helper
```

### Browser

Download the IIFE style module from `build/MultipassShaderHelper.browser.js`.

## Import

### Node

```js
import { MultipassShaderHelper } from "three-multipass-shader-helper";
```

### Browser

```html
<script src="three.js"></script>
<script src="MultipassShaderHelper.browser.js"></script>

<!-- Your script -->
<script src="main.js" defer></script>
```

## Use

It's quite straightforward.

### Create passes

```js
const passes = {
  BufferA: {
    vertexShader: `...`,
    fragmentShader: `...`,
    uniforms: {
      // Takes in regular uniforms
      uDelta: { value: 0 },

      // And other passes
      BufferB: { value: new MultipassShaderHelper.Dependency() },
      //                    Must have this type
    },
    onLoadTexture: (texture) => {
      /*...Fill texture maybe?*/
    },
  },
  BufferB: {
    vertexShader: pVert,
    fragmentShader: pFrag,
    // Uniforms and `onLoadTexture` are optional
  },
};
```

### Apply passes

```js
const gpuCompute = new MultipassShaderHelper(renderer, passes);
const material = new THREE.ShaderMaterial({
  vertexShader: `...`,
  fragmentShader: `...`,
  uniforms: {
    BufferA: { value: gpu.textures.BufferA() },
    BufferB: { value: gpu.textures.BufferB() },
  },
});

// ...

const clock = new THREE.Clock();
function render() {
  const delta = clock.getDelta();

  // Get a buffer's variable
  const { BufferA } = gpuCompute.allVariables;
  // Update its uniforms
  BufferA.material.uniforms.uDelta = delta;

  // Use it
  material.uniforms.BufferA.value = gpu.textures.BufferA();
  material.uniforms.BufferB.value = gpu.textures.BufferB();

  // Compute the shaders
  gpuCompute.compute();
}
```
