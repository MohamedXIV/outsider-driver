import './styles.css';
import { GameApplication } from './app/GameApplication';
import { BabylonRenderingRuntime } from './rendering/BabylonRenderingRuntime';
import { createGameSurface } from './ui/createGameSurface';

const root = document.querySelector<HTMLElement>('#app');

if (root === null) {
  throw new Error('Application root #app was not found.');
}

const surface = createGameSurface(root);
const rendering = new BabylonRenderingRuntime(surface.canvas);
const application = new GameApplication(rendering);

application.start();

if (import.meta.hot !== undefined) {
  import.meta.hot.dispose(() => {
    application.dispose();
    surface.dispose();
  });
}
