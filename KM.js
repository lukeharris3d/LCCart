const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async function () {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(1, 1, 1, 1);

  const model1Url = "https://lukeharris3d.github.io/LCCart/glb/KM_A01.glb";
  const model2aUrl = "https://lukeharris3d.github.io/LCCart/glb/KM_A02a.glb";
  const model2Url = "https://lukeharris3d.github.io/LCCart/glb/KM_A02.glb";
  const model3Url = "https://lukeharris3d.github.io/LCCart/glb/KM_A03.glb";
  const envUrl =
    "https://lukeharris3d.github.io/LCCart/env/homecoming_center_rooftop_2k.env";

  // 1. Camera setup
  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    3,
    1.2,
    12,
    new BABYLON.Vector3(4, 0, 0),
    scene
  );
  camera.setPosition(new BABYLON.Vector3(12, 5, 13));
  camera.attachControl(canvas, true);
  camera.upperBetaLimit = (Math.PI / 2) * 0.98;
  camera.wheelPrecision = 50;
  camera.minZ = 0.2; // Set minimum clipping plane to 0.2

  // Environment
  const envTex = BABYLON.CubeTexture.CreateFromPrefilteredData(envUrl, scene);
  scene.environmentTexture = envTex;
  scene.imageProcessingConfiguration.exposure = 1;
  scene.environmentIntensity = 0.7;

  // Simple Lighting
  const light = new BABYLON.DirectionalLight(
    "dir01",
    new BABYLON.Vector3(-0.2, -1, -0.8),
    scene
  );
  light.position = new BABYLON.Vector3(20, 15, 20);
  light.intensity = 1;
  light.autoCalcShadowZBounds = true;

  // Shadows
  const shadowGenerator = new BABYLON.ShadowGenerator(2048, light);
  shadowGenerator.getShadowMap().renderList = scene.meshes;
  shadowGenerator.bias = 0.001;

  // Ensure all newly added meshes receive shadows
  scene.onNewMeshAddedObservable.add((mesh) => {
    mesh.receiveShadows = true;
  });

  // Ground Plane
  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground",
    { width: 20, height: 20 },
    scene
  );
  const groundMat = new BABYLON.PBRMaterial("groundMat", scene);
  groundMat.albedoColor = new BABYLON.Color3(1, 1, 1);
  groundMat.roughness = 0.9;
  ground.material = groundMat;
  ground.receiveShadows = true;

  // 4. Load Models
  let model1Meshes, model2aMeshes, model2Meshes, model3Meshes;

  const loadModel = async (url, zPos) => {
    const result = await BABYLON.SceneLoader.ImportMeshAsync(
      "",
      url,
      "",
      scene
    );
    const root = result.meshes[0];
    root.position.y = 0; // Grounding
    root.position.z = zPos; // Position along Z axis

    return result.meshes; // Return all sub-meshes for reliable toggling
  };

  // Load models at the center
  model1Meshes = await loadModel(model1Url, 0);
  model2aMeshes = await loadModel(model2aUrl, 0);
  model2Meshes = await loadModel(model2Url, 0);
  model3Meshes = await loadModel(model3Url, 0);

  // 5. Modern GUI
  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
  const container = new BABYLON.GUI.StackPanel();
  container.width = "140px";
  container.horizontalAlignment =
    BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
  container.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
  container.top = "-40px";
  container.left = "-40px";
  container.spacing = 12;
  ui.addControl(container);

  // Updated to accept an onToggle callback and return a state controller
  const createModernButton = (text, meshes, initialState = true, onToggle = null) => {
    const btn = BABYLON.GUI.Button.CreateSimpleButton(text, text);
    btn.height = "44px";
    btn.cornerRadius = 8;
    btn.thickness = 0;
    btn.fontSize = "13px";
    btn.fontFamily = "Segoe UI, sans-serif";
    btn.fontWeight = "400";
    btn.shadowColor = "rgba(0,0,0,0.1)";
    btn.shadowBlur = 10;
    btn.shadowOffsetY = 4;

    let isEnabled = initialState;

    // Helper function to update meshes and button visuals
    const setState = (state) => {
      isEnabled = state;
      meshes.forEach((m) => m.setEnabled(isEnabled));
      btn.background = isEnabled ? "#FFFFFF" : "#F0F0F0";
      btn.color = isEnabled ? "#000000" : "#999999";
    };

    // Initialize state
    setState(initialState);

    btn.onPointerUpObservable.add(() => {
      setState(!isEnabled);
      if (onToggle) {
        onToggle(isEnabled);
      }
    });

    btn.onPointerEnterObservable.add(() => {
      btn.background = "#F8F8F8";
      btn.shadowBlur = 15;
    });
    btn.onPointerOutObservable.add(() => {
      btn.background = isEnabled ? "#FFFFFF" : "#F0F0F0";
      btn.shadowBlur = 10;
    });

    container.addControl(btn);

    return { setState };
  };

  // Create buttons
  createModernButton("Butterfly", model1Meshes, true);

  let bikeOpt1Btn, bikeOpt2Btn;

  // Bike Rack Opt 1: On by default. When turned on, turns Opt 2 off.
  bikeOpt1Btn = createModernButton("bike rack opt 1", model2aMeshes, true, (isEnabled) => {
    if (isEnabled && bikeOpt2Btn) {
      bikeOpt2Btn.setState(false);
    }
  });

  // Bike Opt 2: Hidden by default. When turned on, turns Opt 1 off.
  bikeOpt2Btn = createModernButton("bike opt 2", model2Meshes, false, (isEnabled) => {
    if (isEnabled && bikeOpt1Btn) {
      bikeOpt1Btn.setState(false);
    }
  });

  createModernButton("Ground Treatment", model3Meshes, false); // Hidden by default

  return scene;
};

createScene().then((scene) => {
  engine.runRenderLoop(() => scene.render());
});

window.addEventListener("resize", () => engine.resize());
