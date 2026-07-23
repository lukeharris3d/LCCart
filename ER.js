const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async function () {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(1, 1, 1, 1);

  const model1Url = "https://lukeharris3d.github.io/LCCart/glb/ER_01.glb";
  const model2Url = "https://lukeharris3d.github.io/LCCart/glb/ER_02.glb";
  const envUrl =
    "https://lukeharris3d.github.io/LCCart/env/homecoming_center_rooftop_2k.env";

  // 1. Camera setup
  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    3,
    3,
    12,
    new BABYLON.Vector3(0, 0.5, 0),
    scene
  );
  camera.attachControl(canvas, true);
  camera.upperBetaLimit = (Math.PI / 2) * 0.98;
  camera.wheelPrecision = 50;

  // 2. Environment & Lighting
  const envTex = BABYLON.CubeTexture.CreateFromPrefilteredData(envUrl, scene);
  scene.environmentTexture = envTex;

  // Increase exposure by 0.5 (Default is 1.0)
  scene.imageProcessingConfiguration.exposure = 1.5;

  // 3. Ground Plane
  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground",
    { width: 20, height: 20 },
    scene
  );
  const groundMat = new BABYLON.PBRMaterial("groundMat", scene);
  groundMat.albedoColor = new BABYLON.Color3(1, 1, 1);
  groundMat.roughness = 0.9;
  ground.material = groundMat;

  // 4. Shadow Pipeline Config
  const gBuffer = scene.enableGeometryBufferRenderer();
  if (gBuffer) {
    gBuffer.enablePosition = true;
    gBuffer.enableNormal = true;
  }

  const iblShadows = new BABYLON.IblShadowsRenderPipeline(
    "iblShadows",
    scene,
    {
      resolutionExp: 6,
      sampleDirections: 32,
      ssShadowsEnabled: true,
      shadowRemanence: 0.7,
      triPlanarVoxelization: true,
      shadowOpacity: 1.5,
    },
    [camera]
  );

  iblShadows.ssShadowOpacity = 1.0;
  iblShadows.addShadowReceivingMaterial(groundMat);

  // 5. Load Models - Changed helper to use zPos instead of xPos
  let model1, model2;

  const loadModel = async (url, zPos) => {
    const result = await BABYLON.SceneLoader.ImportMeshAsync(
      "",
      url,
      "",
      scene
    );
    const root = result.meshes[0];
    const bounds = scene.getWorldExtends();

    root.position.y -= bounds.min.y; // Grounding
    root.position.z = zPos; // Position along Z axis

    result.meshes.forEach((m) => {
      if (m instanceof BABYLON.Mesh) iblShadows.addShadowCastingMesh(m);
      if (m.material) iblShadows.addShadowReceivingMaterial(m.material);
    });
    return root;
  };

  // model1 at Z=0, model2 at Z=3
  model1 = await loadModel(model1Url, 0);
  model2 = await loadModel(model2Url, 0);

  // Initial shadow calculation
  iblShadows.updateSceneBounds();
  iblShadows.updateVoxelization();

  // 6. Modern GUI
  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
  const container = new BABYLON.GUI.StackPanel();
  container.width = "120px";
  container.horizontalAlignment =
    BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
  container.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
  container.top = "-40px";
  container.left = "-40px";
  container.spacing = 12;
  ui.addControl(container);

  const createModernButton = (text, model) => {
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

    btn.onPointerUpObservable.add(() => {
      model.setEnabled(!model.isEnabled());
      iblShadows.updateVoxelization();
      btn.background = model.isEnabled() ? "#FFFFFF" : "#F0F0F0";
      btn.color = model.isEnabled() ? "#000000" : "#999999";
    });

    btn.onPointerEnterObservable.add(() => {
      btn.background = "#F8F8F8";
      btn.shadowBlur = 15;
    });
    btn.onPointerOutObservable.add(() => {
      btn.background = model.isEnabled() ? "#FFFFFF" : "#F0F0F0";
      btn.shadowBlur = 10;
    });

    container.addControl(btn);
  };

  createModernButton("Bike Rack", model1);
  createModernButton("Seating", model2);

  return scene;
};

createScene().then((scene) => {
  engine.runRenderLoop(() => scene.render());
});

window.addEventListener("resize", () => engine.resize());
