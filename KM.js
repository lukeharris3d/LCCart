const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async function () {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(1, 1, 1, 1);

  const envUrl =
    "https://lukeharris3d.github.io/LCCart/env/homecoming_center_rooftop_km.env";

  // The 3 KM model URLs
  const modelUrls = [
    "https://lukeharris3d.github.io/LCCart/glb/KM_01.glb",
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
  camera.setPosition(new BABYLON.Vector3(6, 4, 6));
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
      loadedModels.get(currentActiveUrl).setEnabled(false);
    }
    currentActiveUrl = url;

    // Show or Load
    if (loadedModels.has(url)) {
      loadedModels.get(url).setEnabled(true);
    } else {
      const result = await BABYLON.SceneLoader.ImportMeshAsync(
        "",
        url,
        "",
        scene
      );
      const root = result.meshes[0];

      // Grounding logic
      root.position.y = 0;
      loadedModels.set(url, root);
    }
  };

  // Pre-load Bike Rack model (starts hidden)
  const bikeRackResult = await BABYLON.SceneLoader.ImportMeshAsync(
    "",
    bikeRackUrl,
    "",
    scene
  );
  const bikeRackModel = bikeRackResult.meshes[0];
  bikeRackModel.position.y = 0;
  bikeRackModel.setEnabled(false);

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

  // Create Option 1, Option 2, Option 3 buttons
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

  // Default selection
  await selectModel(modelUrls[0], buttonControls[0]);

  // Bike Rack Toggle Button (under the Option buttons)
  const bikeRackBtn = BABYLON.GUI.Button.CreateSimpleButton(
    "btnBikeRack",
    "Bike Rack"
  );
  applyModernStyle(bikeRackBtn);

  bikeRackBtn.onPointerEnterObservable.add(() => {
    if (!bikeRackModel.isEnabled()) bikeRackBtn.background = "#F8F8F8";
  });
  bikeRackBtn.onPointerOutObservable.add(() => {
    if (!bikeRackModel.isEnabled()) bikeRackBtn.background = "#FFFFFF";
  });

  bikeRackBtn.onPointerUpObservable.add(() => {
    const isEnabled = !bikeRackModel.isEnabled();
    bikeRackModel.setEnabled(isEnabled);
    bikeRackBtn.background = isEnabled ? "#E0E0E0" : "#FFFFFF";
  });

  mainContainer.addControl(bikeRackBtn);

  // --- BOTTOM-LEFT STACK PANEL (Fullscreen & Screenshot Buttons) ---
  const leftContainer = new BABYLON.GUI.StackPanel();
  leftContainer.width = "140px";
  leftContainer.horizontalAlignment =
    BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  leftContainer.verticalAlignment =
    BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
  leftContainer.top = "-40px";
  leftContainer.left = "40px";
  leftContainer.spacing = 12;
  ui.addControl(leftContainer);

  // 1. FULLSCREEN BUTTON (Above Screenshot Button)
  const fullscreenBtn = BABYLON.GUI.Button.CreateSimpleButton(
    "fullscreenBtn",
    "⛶ Fullscreen"
  );
  fullscreenBtn.height = "44px";
  fullscreenBtn.color = "#000000";
  fullscreenBtn.background = "#FFFFFF";
  fullscreenBtn.cornerRadius = 8;
  fullscreenBtn.thickness = 0;
  fullscreenBtn.fontSize = "13px";
  fullscreenBtn.fontFamily = "Segoe UI, sans-serif";
  fullscreenBtn.fontWeight = "400";
  fullscreenBtn.shadowColor = "rgba(0,0,0,0.1)";
  fullscreenBtn.shadowBlur = 10;
  fullscreenBtn.shadowOffsetY = 4;

  fullscreenBtn.onPointerUpObservable.add(() => {
    engine.switchFullscreen(false); // Toggle full screen mode
  });

  fullscreenBtn.onPointerEnterObservable.add(() => {
    fullscreenBtn.background = "#F8F8F8";
    fullscreenBtn.shadowBlur = 15;
  });
  fullscreenBtn.onPointerOutObservable.add(() => {
    fullscreenBtn.background = "#FFFFFF";
    fullscreenBtn.shadowBlur = 10;
  });

  leftContainer.addControl(fullscreenBtn);

  // 2. SCREENSHOT BUTTON
  const screenshotBtn = BABYLON.GUI.Button.CreateSimpleButton(
    "screenshotBtn",
    "📷 Screenshot"
  );
  screenshotBtn.height = "44px";
  screenshotBtn.color = "#000000";
  screenshotBtn.background = "#FFFFFF";
  screenshotBtn.cornerRadius = 8;
  screenshotBtn.thickness = 0;
  screenshotBtn.fontSize = "13px";
  screenshotBtn.fontFamily = "Segoe UI, sans-serif";
  screenshotBtn.fontWeight = "400";
  screenshotBtn.shadowColor = "rgba(0,0,0,0.1)";
  screenshotBtn.shadowBlur = 10;
  screenshotBtn.shadowOffsetY = 4;

  screenshotBtn.onPointerUpObservable.add(async () => {
    // Hide all GUI buttons temporarily
    ui.rootContainer.isVisible = false;

    // Take high-res screenshot (2x resolution)
    const dataUrl = await BABYLON.Tools.CreateScreenshotAsync(engine, camera, {
      precision: 2,
    });

    // Restore GUI buttons immediately after render
    ui.rootContainer.isVisible = true;

    // Download PNG file
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `scene_screenshot_clean_${Date.now()}.png`;
    link.click();
  });

  screenshotBtn.onPointerEnterObservable.add(() => {
    screenshotBtn.background = "#F8F8F8";
    screenshotBtn.shadowBlur = 15;
  });
  screenshotBtn.onPointerOutObservable.add(() => {
    screenshotBtn.background = "#FFFFFF";
    screenshotBtn.shadowBlur = 10;
  });

  leftContainer.addControl(screenshotBtn);

  return scene;
};

createScene().then((scene) => {
  engine.runRenderLoop(() => scene.render());
});

window.addEventListener("resize", () => engine.resize());
