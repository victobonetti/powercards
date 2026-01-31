import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Check if window is already defined to avoid errors
if (!global.window) {
    GlobalRegistrator.register();
}
