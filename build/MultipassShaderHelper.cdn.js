import * as THREE from 'https://cdn.skypack.dev/three';

class GPUComputationRenderer {
  constructor(sizeX, sizeY, renderer) {
    this.sizeX = sizeX;
    this.sizeY = sizeY;
    this.renderer = renderer;
    this.variables = [];
    this.currentTextureIndex = 0;
    let dataType = THREE.FloatType;
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    camera.position.z = 1;
    const passThruUniforms = {
      passThruTexture: {
        value: null,
      },
    };
    const passThruShader = createShaderMaterial(
      getPassThroughFragmentShader(),
      getPassThroughVertexShader(),
      passThruUniforms
    );
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), passThruShader);
    scene.add(mesh);
    this.setDataType = function (type) {
      dataType = type;
      return this;
    };
    this.addVariable = function (
      variableName,
      computeFragmentShader,
      computeVertexShader,
      initialValueTexture
    ) {
      const material = this.createShaderMaterial(
        computeFragmentShader,
        computeVertexShader
      );
      const variable = {
        name: variableName,
        initialValueTexture: initialValueTexture,
        material: material,
        dependencies: null,
        renderTargets: [],
        wrapS: null,
        wrapT: null,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
      };
      this.variables.push(variable);
      return variable;
    };
    this.setVariableDependencies = function (variable, dependencies) {
      variable.dependencies = dependencies;
    };
    this.getCurrentRenderTarget = function (variable) {
      return variable.renderTargets[this.currentTextureIndex];
    };
    this.getAlternateRenderTarget = function (variable) {
      return variable.renderTargets[this.currentTextureIndex === 0 ? 1 : 0];
    };
    function addResolutionDefine(materialShader) {
      materialShader.defines.resolution =
        "vec2( " + sizeX.toFixed(1) + ", " + sizeY.toFixed(1) + " )";
    }
    this.addResolutionDefine = addResolutionDefine;
    function createShaderMaterial(
      computeFragmentShader,
      computeVertexShader,
      uniforms
    ) {
      uniforms = uniforms || {};
      const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: computeVertexShader || getPassThroughVertexShader(),
        fragmentShader: computeFragmentShader,
      });
      addResolutionDefine(material);
      return material;
    }
    this.createShaderMaterial = createShaderMaterial;
    this.createRenderTarget = function (
      sizeXTexture,
      sizeYTexture,
      wrapS,
      wrapT,
      minFilter,
      magFilter
    ) {
      sizeXTexture = sizeXTexture || sizeX;
      sizeYTexture = sizeYTexture || sizeY;
      wrapS = wrapS || THREE.ClampToEdgeWrapping;
      wrapT = wrapT || THREE.ClampToEdgeWrapping;
      minFilter = minFilter || THREE.NearestFilter;
      magFilter = magFilter || THREE.NearestFilter;
      const renderTarget = new THREE.WebGLRenderTarget(
        sizeXTexture,
        sizeYTexture,
        {
          wrapS: wrapS,
          wrapT: wrapT,
          minFilter: minFilter,
          magFilter: magFilter,
          format: THREE.RGBAFormat,
          type: dataType,
          depthBuffer: false,
        }
      );
      return renderTarget;
    };
    this.createTexture = function () {
      const data = new Float32Array(sizeX * sizeY * 4);
      return new THREE.DataTexture(
        data,
        sizeX,
        sizeY,
        THREE.RGBAFormat,
        THREE.FloatType
      );
    };
    this.renderTexture = function (input, output) {
      passThruUniforms.passThruTexture.value = input;
      this.doRenderTarget(passThruShader, output);
      passThruUniforms.passThruTexture.value = null;
    };
    this.doRenderTarget = function (material, output) {
      const currentRenderTarget = renderer.getRenderTarget();
      mesh.material = material;
      renderer.setRenderTarget(output);
      renderer.render(scene, camera);
      mesh.material = passThruShader;
      renderer.setRenderTarget(currentRenderTarget);
    };
    function getPassThroughVertexShader() {
      return (
        "void main()	{\n" +
        "\n" +
        "	gl_Position = vec4( position, 1.0 );\n" +
        "\n" +
        "}\n"
      );
    }
    function getPassThroughFragmentShader() {
      return (
        "uniform sampler2D passThruTexture;\n" +
        "\n" +
        "void main() {\n" +
        "\n" +
        "	vec2 uv = gl_FragCoord.xy / resolution.xy;\n" +
        "\n" +
        "	gl_FragColor = texture2D( passThruTexture, uv );\n" +
        "\n" +
        "}\n"
      );
    }
  }
  init() {
    if (
      this.renderer.capabilities.isWebGL2 === false &&
      this.renderer.extensions.has("OES_texture_float") === false
    ) {
      return "No OES_texture_float support for float textures.";
    }
    if (this.renderer.capabilities.maxVertexTextures === 0) {
      return "No support for vertex shader textures.";
    }
    for (let i = 0; i < this.variables.length; i++) {
      const variable = this.variables[i];
      variable.renderTargets[0] = this.createRenderTarget(
        this.sizeX,
        this.sizeY,
        variable.wrapS,
        variable.wrapT,
        variable.minFilter,
        variable.magFilter
      );
      variable.renderTargets[1] = this.createRenderTarget(
        this.sizeX,
        this.sizeY,
        variable.wrapS,
        variable.wrapT,
        variable.minFilter,
        variable.magFilter
      );
      this.renderTexture(
        variable.initialValueTexture,
        variable.renderTargets[0]
      );
      this.renderTexture(
        variable.initialValueTexture,
        variable.renderTargets[1]
      );
      const material = variable.material;
      const uniforms = material.uniforms;
      if (variable.dependencies !== null) {
        for (let d = 0; d < variable.dependencies.length; d++) {
          const depVar = variable.dependencies[d];
          if (depVar.name !== variable.name) {
            let found = false;
            for (let j = 0; j < this.variables.length; j++) {
              if (depVar.name === this.variables[j].name) {
                found = true;
                break;
              }
            }
            if (!found) {
              return (
                "Variable dependency not found. Variable=" +
                variable.name +
                ", dependency=" +
                depVar.name
              );
            }
          }
          uniforms[depVar.name] = {
            value: null,
          };
          material.fragmentShader =
            "\nuniform sampler2D " +
            depVar.name +
            ";\n" +
            material.fragmentShader;
        }
      }
    }
    this.currentTextureIndex = 0;
    return null;
  }
  compute() {
    const currentTextureIndex = this.currentTextureIndex;
    const nextTextureIndex = this.currentTextureIndex === 0 ? 1 : 0;
    for (let i = 0, il = this.variables.length; i < il; i++) {
      const variable = this.variables[i];
      if (variable.dependencies !== null) {
        const uniforms = variable.material.uniforms;
        for (let d = 0, dl = variable.dependencies.length; d < dl; d++) {
          const depVar = variable.dependencies[d];
          uniforms[depVar.name].value =
            depVar.renderTargets[currentTextureIndex].texture;
        }
      }
      this.doRenderTarget(
        variable.material,
        variable.renderTargets[nextTextureIndex]
      );
    }
    this.currentTextureIndex = nextTextureIndex;
  }
}

class MultipassShaderHelper extends GPUComputationRenderer {
    constructor(renderer, passes, width = 512, height = 512) {
        super(width, height, renderer);
        this.textures = {};
        this.allVariables = {};
        Object.keys(passes).forEach((name) => {
            const pass = passes[name];
            // Texture
            const texture = this.createTexture();
            if (pass.onLoadTexture)
                pass.onLoadTexture(texture);
            // Variable
            const variable = this.addVariable(name, pass.fragmentShader, pass.vertexShader, texture);
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
                    }
                    else {
                        cVariable.material.uniforms[key] = uniform;
                    }
                }
                this.setVariableDependencies(cVariable, deps);
            }
        });
        this.textures = {};
        for (const name in this.allVariables) {
            this.textures[name] = (() => this.getCurrentRenderTarget(this.allVariables[name]).texture).bind(this);
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
MultipassShaderHelper.Dependency = class Dependency {
};

export { MultipassShaderHelper };
//# sourceMappingURL=MultipassShaderHelper.cdn.js.map
