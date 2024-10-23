import SetupItems from './ItemUtils.js';
import SetupAbilities from './AbilityUtils.js'
import SetupCombat from './CombatUtils.js';
import SetupScene from './SceneUtils.js';

export default async function HookScriptSetup(){

    console.log("SETTING UP HOOK SCRIPTS!");

    Hooks.on('init', SetupGlobalFunctions)

    await SetupAbilities();
    await SetupItems();
    await SetupCombat();
    await SetupScene();
}

async function SetupGlobalFunctions() {
    game.globalFunctions = {"test":0};
}