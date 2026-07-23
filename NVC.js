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
  scene.imageProcessingConfiguration.exposure = 1;

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
  let currentActiveUrl = null;

  const selectModel = async (url) => {
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

  // 6. UI Implementation
  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

  const mainContainer = new BABYLON.GUI.StackPanel();
  mainContainer.width = "220px";
  mainContainer.horizontalAlignment =
    BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
  mainContainer.verticalAlignment =
    BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
  mainContainer.left = "-40px";
  mainContainer.top = "-40px";
  ui.addControl(mainContainer);

  const listContainer = new BABYLON.GUI.StackPanel();
  listContainer.width = "100%";
  listContainer.background = "#FFFFFF";
  listContainer.cornerRadius = 8;
  listContainer.isVisible = false;
  listContainer.paddingBottom = "8px";
  listContainer.paddingTop = "8px";
  listContainer.shadowColor = "rgba(0,0,0,0.1)";
  listContainer.shadowBlur = 10;
  listContainer.shadowOffsetY = 4;
  mainContainer.addControl(listContainer);

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
      `Sculpture ${index + 1}`
    );
    applyModernStyle(btn);
    btn.shadowBlur = 0;
    btn.shadowOffsetY = 0;

    btn.onPointerEnterObservable.add(() => {
      btn.background = "#F8F8F8";
    });
    btn.onPointerOutObservable.add(() => {
      btn.background = "#FFFFFF";
    });

    btn.onPointerUpObservable.add(() => {
      selectModel(url);
      listContainer.isVisible = false;
      menuTrigger.text = "SELECT ARTWORK ▴";
    });

    listContainer.addControl(btn);
  });

  const menuTrigger = BABYLON.GUI.Button.CreateSimpleButton(
    "menuTrigger",
    "SELECT ARTWORK ▴"
  );
  applyModernStyle(menuTrigger);
  menuTrigger.top = "12px";

  menuTrigger.onPointerUpObservable.add(() => {
    listContainer.isVisible = !listContainer.isVisible;
    menuTrigger.text = listContainer.isVisible
      ? "HIDE MENU ▾"
      : "SELECT ARTWORK ▴";
  });
  mainContainer.addControl(menuTrigger);

  // --- SET DEFAULT MODEL ---
  // This calls the loading function for the first URL in your list automatically
  selectModel(modelUrls[0]);

  return scene;
};

createScene().then((scene) => {
  engine.runRenderLoop(() => scene.render());
});

window.addEventListener("resize", () => engine.resize());
