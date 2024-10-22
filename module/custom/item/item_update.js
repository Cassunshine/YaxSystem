const targetItem = scope._templateSystem.entity;
const parent = targetItem.parent;

if(parent == null)
    return;

await game.macros.getName("configure_abilities").execute(parent);