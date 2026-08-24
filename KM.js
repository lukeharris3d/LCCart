const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async function () {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(1, 1, 1, 1);

  const envUrl =
    "https://lukeharris3d.github.io/LCCart/env/homecoming_center_rooftop_km.env";

  // KM_01 removed; KM_02 is at index 0 (default)
  const modelUrls = [
    "https://lukeharris3d.github.io/LCCart/glb/KM_02.glb",
    "https://lukeharris3d.github.io/LCCart/glb/KM_03.glb",
  ];
  const bikeRackUrl = "https://lukeharris3d.github.io/LCCart/glb/KM_04.glb";

  // 1. Camera setup
  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    3,
    1.2,
    12,
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  camera.attachControl(canvas, true);
  camera.setPosition(new BABYLON.Vector3(7, 4, 10));
  camera.upperBetaLimit = (Math.PI / 2) * 0.98;
  camera.wheelPrecision = 50;

  // Environment
  const envTex = BABYLON.CubeTexture.CreateFromPrefilteredData(envUrl, scene);
  scene.environmentTexture = envTex;
  scene.imageProcessingConfiguration.exposure = 1;
  scene.environmentIntensity = 0.6;

  // Simple Lighting
  const light = new BABYLON.DirectionalLight(
    "dir01",
    new BABYLON.Vector3(0.2, -1, 0.4),
    scene
  );
  light.position = new BABYLON.Vector3(20, 15, 20);
  light.intensity = 5;
  light.autoCalcShadowZBounds = true;

  // Shadows
  const shadowGenerator = new BABYLON.ShadowGenerator(2048, light);
  shadowGenerator.getShadowMap().renderList = scene.meshes;
  shadowGenerator.bias = 0.01;
  shadowGenerator._darkness = -2;

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

  // Helper to enable/disable sub-meshes
  const setModelEnabled = (nodeOrMeshes, enabled) => {
    if (Array.isArray(nodeOrMeshes)) {
      nodeOrMeshes.forEach((m) => m.setEnabled(enabled));
    } else if (nodeOrMeshes) {
      nodeOrMeshes.setEnabled(enabled);
    }
  };

  // 4. Model Management
  const loadedModels = new Map();
  const buttonControls = [];
  let currentActiveUrl = null;

  const selectModel = async (url, targetBtn) => {
    // UI Update: Reset all option buttons
    buttonControls.forEach((btn) => (btn.background = "#FFFFFF"));
    if (targetBtn) targetBtn.background = "#E0E0E0";

    // Disable previous model
    if (currentActiveUrl && loadedModels.has(currentActiveUrl)) {
      setModelEnabled(loadedModels.get(currentActiveUrl), false);
    }
    currentActiveUrl = url;

    // Show or Load
    if (loadedModels.has(url)) {
      setModelEnabled(loadedModels.get(url), true);
    } else {
      const result = await BABYLON.SceneLoader.ImportMeshAsync(
        "",
        url,
        "",
        scene
      );
      result.meshes[0].position.y = 0;
      loadedModels.set(url, result.meshes);
      setModelEnabled(result.meshes, true);
    }
  };

  // Pre-load Bike Rack model (visible by default)
  const bikeRackResult = await BABYLON.SceneLoader.ImportMeshAsync(
    "",
    bikeRackUrl,
    "",
    scene
  );
  const bikeRackModel = bikeRackResult.meshes[0];
  bikeRackModel.position.y = 0;
  setModelEnabled(bikeRackResult.meshes, true); // Enabled by default

  scene.meshes.forEach((mesh) => {
    mesh.receiveShadows = true;
  });

  // 5. UI Implementation
  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

  const mainContainer = new BABYLON.GUI.StackPanel();
  mainContainer.width = "110px";
  mainContainer.spacing = 8;
  mainContainer.horizontalAlignment =
    BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
  mainContainer.verticalAlignment =
    BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  mainContainer.left = "-40px";
  ui.addControl(mainContainer);

  const applyModernStyle = (btn) => {
    btn.height = "44px";
    btn.color = "#000000";
    btn.background = "#FFFFFF";
    btn.cornerRadius = 8;
    btn.thickness = 0;
    btn.fontSize = "13px";
    btn.fontFamily = "Segoe UI, sans-serif";
    btn.fontWeight = "400";
    btn.shadowColor = "rgba(0,0,0,0.1)";
    btn.shadowBlur = 10;
    btn.shadowOffsetY = 4;
  };

  // Create Option buttons
  modelUrls.forEach((url, index) => {
    const btn = BABYLON.GUI.Button.CreateSimpleButton(
      `btn${index}`,
      `Option ${index + 1}`
    );
    applyModernStyle(btn);

    btn.onPointerEnterObservable.add(() => {
      if (currentActiveUrl !== url) btn.background = "#F8F8F8";
    });
    btn.onPointerOutObservable.add(() => {
      if (currentActiveUrl !== url) btn.background = "#FFFFFF";
    });

    btn.onPointerUpObservable.add(() => {
      selectModel(url, btn);
    });

    mainContainer.addControl(btn);
    buttonControls.push(btn);
  });

  // Default selection: KM_02 (index 0)
  await selectModel(modelUrls[0], buttonControls[0]);

  // Bike Rack Toggle Button (Active by default)
  const bikeRackBtn = BABYLON.GUI.Button.CreateSimpleButton(
    "btnBikeRack",
    "Bike Rack"
  );
  applyModernStyle(bikeRackBtn);
  bikeRackBtn.background = "#E0E0E0"; // Active background state

  bikeRackBtn.onPointerEnterObservable.add(() => {
    if (!bikeRackModel.isEnabled()) bikeRackBtn.background = "#F8F8F8";
  });
  bikeRackBtn.onPointerOutObservable.add(() => {
    bikeRackBtn.background = bikeRackModel.isEnabled() ? "#E0E0E0" : "#FFFFFF";
  });

  bikeRackBtn.onPointerUpObservable.add(() => {
    const isEnabled = !bikeRackModel.isEnabled();
    setModelEnabled(bikeRackResult.meshes, isEnabled);
    bikeRackBtn.background = isEnabled ? "#E0E0E0" : "#FFFFFF";
  });

  mainContainer.addControl(bikeRackBtn);

  return scene;
};

createScene().then((scene) => {
  engine.runRenderLoop(() => scene.render());
});

window.addEventListener("resize", () => engine.resize());
