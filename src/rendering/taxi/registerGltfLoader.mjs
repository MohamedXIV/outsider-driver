// Isolate the Babylon 9.28 glTF loader's upstream TS6 declaration incompatibility.
// Vite bundles the official loader as a lazy chunk; TypeScript still validates
// our typed rendering adapter without weakening skipLibCheck.
import '@babylonjs/loaders/glTF';
