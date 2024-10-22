const item = scope._templateSystem.entity;

if(item.system.props.cooldown > 0){
    ui.notifications.error("This ability is still on cooldown!");
    return;
}

await scope._templateSystem.entity.update({['system.props.isDeclared'] : true});