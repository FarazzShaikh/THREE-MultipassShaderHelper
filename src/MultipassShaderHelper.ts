import * as THREE from "three";
import { GPUComputationRenderer } from "./GPUComputationRenderer";

type TPass = {
  vertexShader: string;
  fragmentShader: string;
  uniforms: {
    [key: string]: THREE.IUniform<any>;
  };
  onLoadTexture: (texture: THREE.DataTexture) => void;
};

type TPasses = {
  [key: string]: TPass;
};

export class MultipassShaderHelper extends GPUComputationRenderer {
  static Dependency = class Dependency {};

  textures: {
    [key: string]: () => THREE.DataTexture[];
  } = {};

  allVariables: {
    [key: string]: any;
  } = {};

  constructor(
    renderer: THREE.WebGLRenderer,
    passes: TPasses,
    width: number = 512,
    height: number = 512
  ) {
    super(width, height, renderer);

    Object.keys(passes).forEach((name) => {
      const pass = passes[name];

      // Texture
      const texture = this.createTexture();
      if (pass.onLoadTexture) pass.onLoadTexture(texture);

      // Variable
      const variable = this.addVariable(
        name,
        pass.fragmentShader,
        pass.vertexShader,
        texture
      );
      this.allVariables[name] = variable;
    });

    Object.keys(passes).forEach((name) => {
      const pass = passes[name];

      if (pass.uniforms) {
        const cVariable = this.variables.find((v) => v.name === name);
        const deps = [];

        for (const key in pass.uniforms) {
          const uniform = pass.uniforms[key];

          if (uniform.value instanceof MultipassShaderHelper.Dependency) {
            const dVariable = this.variables.find((v) => v.name === key);
            deps.push(dVariable);
          } else {
            cVariable.material.uniforms[key] = uniform;
          }
        }
        this.setVariableDependencies(cVariable, deps);
      }
    });

    this.textures = {};
    for (const name in this.allVariables) {
      this.textures[name] = (() =>
        this.getCurrentRenderTarget(this.allVariables[name]).texture).bind(
        this
      );
    }

    this.reset();
  }

  reset() {
    const error = this.init();
    if (error !== null) {
      console.error(error);
    }
  }
}
