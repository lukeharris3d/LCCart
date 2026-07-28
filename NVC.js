const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async function () {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(1, 1, 1, 1);

  const envUrl =
    "https://lukeharris3d.github.io/LCCart/env/homecoming_center_rooftop_2k.env";

  const modelUrls = [
    "https://lukeharris3d.github.io/LCCart/glb/NVC/01.glb",
    "https://lukeharris3d.github.io/LCCart/glb/NVC/02.glb",
    "https://lukeharris3d.github.io/LCCart/glb/NVC/03.glb",
    "https://lukeharris3d.github.io/LCCart/glb/NVC/04.glb",
    "https://lukeharris3d.github.io/LCCart/glb/NVC/05.glb",
    "https://lukeharris3d.github.io/LCCart/glb/NVC/06.glb",
    "https://lukeharris3d.github.io/LCCart/glb/NVC/07.glb",
    "https://lukeharris3d.github.io/LCCart/glb/NVC/08.glb",
    "https://lukeharris3d.github.io/LCCart/glb/NVC/09.glb",
  ];

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
  camera.upperBetaLimit = (Math.PI / 2) * 0.98;
  camera.wheelPrecision = 50;

  // 2. Environment
  const envTex = BABYLON.CubeTexture.CreateFromPrefilteredData(envUrl, scene);
  scene.environmentTexture = envTex;
  scene.imageProcessingConfiguration.exposure = 0.9; // Adjusted for non-shadow lighting

  // 3. Ground
  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground",
    { width: 30, height: 30 },
    scene
  );
  const groundMat = new BABYLON.PBRMaterial("groundMat", scene);
  groundMat.albedoColor = new BABYLON.Color3(1, 1, 1);
  groundMat.roughness = 0.9;
  ground.material = groundMat;

  // 4. Model Management
  const loadedModels = new Map();
  const buttonControls = [];
  let currentActiveUrl = null;

  const selectModel = async (url, targetBtn) => {
    // UI Update: Reset buttons
    buttonControls.forEach((btn) => (btn.background = "#FFFFFF"));
    if (targetBtn) targetBtn.background = "#E0E0E0";

    // Toggle Visibility
    if (currentActiveUrl && loadedModels.has(currentActiveUrl)) {
      loadedModels.get(currentActiveUrl).setEnabled(false);
    }
    currentActiveUrl = url;

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

  // 5. UI Implementation (Permanent Side Stack)
  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

  const mainContainer = new BABYLON.GUI.StackPanel();
  mainContainer.width = "120px";
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
  selectModel(modelUrls[0], buttonControls[0]);

  return scene;
};

createScene().then((scene) => {
  engine.runRenderLoop(() => scene.render());
});

window.addEventListener("resize", () => engine.resize());
