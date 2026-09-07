const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async function () {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(1, 1, 1, 1);

  // Model URLs
  const model1Url = "https://lukeharris3d.github.io/LCCart/glb/RL_01b.glb"; // Default Display Shelter
  const model2Url = "https://lukeharris3d.github.io/LCCart/glb/RL_02.glb";  // Bollards
  const model3Url = "https://lukeharris3d.github.io/LCCart/glb/RL_01a.glb"; // Shelter Up
  const model4Url = "https://lukeharris3d.github.io/LCCart/glb/RL_03.glb";  // Beacon
  const model5Url = "https://lukeharris3d.github.io/LCCart/glb/RL_01.glb";   // Shelter Alt (RL_01)

  const envUrl =
    "https://lukeharris3d.github.io/LCCart/env/homecoming_center_rooftop_2k.env";

  // Camera setup
  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    0,
    0,
    10,
    new BABYLON.Vector3(-5, 0.5, 0),
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
  let model1, model2, model3, model4, model5;

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

  // Shelters share Z = 0 so they swap in the same spot
  model1 = await loadModel(model1Url, 0); // RL_01b.glb (Default Display)
  model3 = await loadModel(model3Url, 0); // RL_01a.glb (Shelter Up)
  model5 = await loadModel(model5Url, 0); // RL_01.glb (Shelter Alt)
  model2 = await loadModel(model2Url, -1); // Bollards
  model4 = await loadModel(model4Url, -1); // Beacon

  // Hide non-default shelter models initially so they don't overlap
  model3.setEnabled(false);
  model5.setEnabled(false);

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
    btn.color = model.isEnabled() ? "#000000" : "#999999";
    btn.background = model.isEnabled() ? "#FFFFFF" : "#F0F0F0";
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

  // Group shelter buttons for mutual exclusivity
  const shelterButtons = [];

  const createShelterButton = (text, model) => {
    const btn = createModernButton(text, model, (isEnabled) => {
      if (isEnabled) {
        // Disable all other shelter models when this one is enabled
        [model1, model3, model5].forEach((m) => {
          if (m !== model) m.setEnabled(false);
        });
        shelterButtons.forEach((b) => b.updateStyle());
      }
    });
    shelterButtons.push(btn);
    return btn;
  };

  // 1. Shelter Buttons (Mutually Exclusive)
  createShelterButton("Shelter", model1);      // RL_01b.glb (Active on start)
  createShelterButton("Shelter Up", model3);   // RL_01a.glb
  createShelterButton("Shelter Alt", model5);  // RL_01.glb

  // 2. Independent Accessory Buttons
  createModernButton("Bollards", model2);
  createModernButton("Beacon", model4);

  return scene;
};

createScene().then((scene) => {
  engine.runRenderLoop(() => scene.render());
});

window.addEventListener("resize", () => engine.resize());
