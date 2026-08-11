const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async function () {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(1, 1, 1, 1);

  // Model URLs
  const model1Url = "https://lukeharris3d.github.io/LCCart/glb/RL_01.glb";
  const model2Url = "https://lukeharris3d.github.io/LCCart/glb/RL_02.glb";
  const model3Url = "https://lukeharris3d.github.io/LCCart/glb/RL_01a.glb";
  const model4Url = "https://lukeharris3d.github.io/LCCart/glb/RL_03.glb";

  const envUrl =
    "https://lukeharris3d.github.io/LCCart/env/homecoming_center_rooftop_2k.env";

  // Camera setup
  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    0,
    0,
    10,
    new BABYLON.Vector3(0 - 5, 0.5, 0),
    scene
  );
  // Set explicit camera position
  camera.setPosition(new BABYLON.Vector3(-20, 8, 2));
  camera.attachControl(canvas, true);
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
  light.intensity = 1;
  light.autoCalcShadowZBounds = true;

  // Shadows
  const shadowGenerator = new BABYLON.ShadowGenerator(2048, light);
  shadowGenerator.getShadowMap().renderList = scene.meshes;
  shadowGenerator.bias = 0.001;

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

  // Load Models
  let model1, model2, model3, model4;

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

    return root;
  };

  // Both shelters share Z = 0 so they swap in the same spot
  model1 = await loadModel(model1Url, 0); // Shelter Up (RL_01.glb)
  model3 = await loadModel(model3Url, 0); // Shelter Down (RL_01a.glb)
  model2 = await loadModel(model2Url, -1); // Bollards
  model4 = await loadModel(model4Url, -1); // Beacon

  // Hide 1a (Shelter Down) initially so it doesn't overlap with 1 on load
  model3.setEnabled(false);

  // GUI Setup
  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
  const container = new BABYLON.GUI.StackPanel();
  container.width = "130px";
  container.horizontalAlignment =
    BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
  container.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
  container.top = "-40px";
  container.left = "-40px";
  container.spacing = 12;
  ui.addControl(container);

  // Button helper with custom toggle callback support
  const createModernButton = (text, model, onToggle = null) => {
    const btn = BABYLON.GUI.Button.CreateSimpleButton(text, text);
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

    const updateStyle = () => {
      btn.background = model.isEnabled() ? "#FFFFFF" : "#F0F0F0";
      btn.color = model.isEnabled() ? "#000000" : "#999999";
    };

    btn.updateStyle = updateStyle;

    btn.onPointerUpObservable.add(() => {
      const isNowEnabled = !model.isEnabled();
      model.setEnabled(isNowEnabled);

      if (onToggle) {
        onToggle(isNowEnabled);
      }

      updateStyle();
    });

    btn.onPointerEnterObservable.add(() => {
      btn.background = "#F8F8F8";
      btn.shadowBlur = 15;
    });
    btn.onPointerOutObservable.add(() => {
      updateStyle();
      btn.shadowBlur = 10;
    });

    container.addControl(btn);
    return btn;
  };

  // 1. Shelter Up Button
  const btnShelter = createModernButton("Shelter Down", model1, (isEnabled) => {
    if (isEnabled) {
      model3.setEnabled(false); // Hide Shelter Down
      btnUmberra.updateStyle();
    }
  });

  // 2. Shelter Down Button (Directly under Shelter Up)
  const btnUmberra = createModernButton("Shelter Up", model3, (isEnabled) => {
    if (isEnabled) {
      model1.setEnabled(false); // Hide Shelter Up
      btnShelter.updateStyle();
    }
  });
  btnUmberra.updateStyle(); // Apply initial disabled visual state

  // 3. Bollards Button
  createModernButton("Bollards", model2);

  // 4. Beacon Button
  createModernButton("Beacon", model4);

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
