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
  scene.imageProcessingConfiguration.exposure = 0.8;

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

  // 4. Shadow Pipeline
  const gBuffer = scene.enableGeometryBufferRenderer();
  const iblShadows = new BABYLON.IblShadowsRenderPipeline(
    "iblShadows",
    scene,
    {
      resolutionExp: 6,
      sampleDirections: 32,
      ssShadowsEnabled: true,
      shadowRemanence: 0.7,
      triPlanarVoxelization: true,
      shadowOpacity: 1,
    },
    [camera]
  );
  iblShadows.ssShadowOpacity = 1.0;
  iblShadows.addShadowReceivingMaterial(groundMat);

  // 5. Model Management
  const loadedModels = new Map();
  const buttonControls = []; // To track buttons for color swapping
  let currentActiveUrl = null;

  const selectModel = async (url, targetBtn) => {
    // UI Update: Reset all buttons to white, set target to active grey
    buttonControls.forEach((btn) => (btn.background = "#FFFFFF"));
    if (targetBtn) targetBtn.background = "#E0E0E0";

    if (currentActiveUrl && loadedModels.has(currentActiveUrl)) {
      loadedModels.get(currentActiveUrl).setEnabled(false);
    }
    currentActiveUrl = url;

    if (loadedModels.has(url)) {
      const root = loadedModels.get(url);
      root.setEnabled(true);
      iblShadows.updateVoxelization();
    } else {
      const result = await BABYLON.SceneLoader.ImportMeshAsync(
        "",
        url,
        "",
        scene
      );
      const root = result.meshes[0];

      // Grounding logic
      const hierarchy = root.getHierarchyBoundingVectors();
      root.position.y -= hierarchy.min.y;

      result.meshes.forEach((m) => {
        if (m instanceof BABYLON.Mesh) {
          iblShadows.addShadowCastingMesh(m);
          if (m.material) iblShadows.addShadowReceivingMaterial(m.material);
        }
      });

      loadedModels.set(url, root);
      iblShadows.updateSceneBounds();
      iblShadows.updateVoxelization();
    }
  };

  // 6. UI Implementation (Permanent Side Stack)
  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

  const mainContainer = new BABYLON.GUI.StackPanel();
  mainContainer.width = "100px";
  mainContainer.spacing = 8; // Gap between buttons
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

  // Load the first model by default and highlight the first button
  selectModel(modelUrls[0], buttonControls[0]);

  return scene;
};

createScene().then((scene) => {
  engine.runRenderLoop(() => scene.render());
});

window.addEventListener("resize", () => engine.resize());
