import { ConfigureAbilities } from './AbilityUtils.js';

export default async function SetupItems(){
    Hooks.on('updateItem', (item, changed, options, userId) => OnItemUpdated(item, userId));
    Hooks.on('createItem', (item, options, userId) => OnItemUpdated(item, userId));
    Hooks.on('deleteItem', (item, options, userId) => OnItemUpdated(item, userId));

    Hooks.on('init', SetupGlobalFunctions)
}

async function SetupGlobalFunctions(){
    game.globalFunctions["equipItem"] = EquipItem;
    game.globalFunctions["unequipItem"] = UnequipItem;
}

async function OnItemUpdated(targetItem, userId){
    const parent = targetItem.parent;

    if(parent == null)
        return;

    await new Promise((r) => setTimeout(r, 100));
    if(parent.sheet != null && parent.sheet.rendered)
        parent.sheet.render();
}

async function EquipItem(targetItem){
    const parent = targetItem.parent;

    //console.clear();

    //Ignore items not on entitites.
    //TODO - Maybe just make them equip onto the selected entity?
    if (parent == null)
        return;

    if(!targetItem.system.props.equipmentType)
        return;

    if(targetItem.system.props.active){
        ui.notifications.info("Item is already equipped.");
        return;
    }

    const targetEquipmentType = targetItem.system.props.equipmentType;
    const isLight = targetItem.system.props.isLightEquipment;

    const equipment = [];
    const equippedTypes = {};

    //Collect all equipment items
    for (const item of parent.items) {
        if (item.system.props.type !== 'equipment')
            continue;

        const equipmentType = item.system.props.equipmentType;

        equipment.push(item);

        if (!item.system.props.active)
            continue;

        if (!equippedTypes[equipmentType])
            equippedTypes[item.system.props.equipmentType] = (item.system.props.isLightEquipment ? 0.5 : 1);
        else 
            equippedTypes[item.system.props.equipmentType] = equippedTypes[item.system.props.equipmentType] + (item.system.props.isLightEquipment ? 0.5 : 1);
    }

    //console.log(equipment);
    //console.log(equippedTypes);

    var types = equippedTypes[targetEquipmentType];

    var equipItem = async (item) => {
        await item.update({["system.props.active"] : true});
    };

    //console.log(isLight);

    if(types == null){
        //Type not equipped, so we can freely equip it.
        await equipItem(targetItem);

        await ConfigureAbilities(parent, game.userId);
    } else if(isLight && types < 1){
        //We have less than 2 light items equipped of this type, so we can equip.
        await equipItem(targetItem);

        await ConfigureAbilities(parent, game.userId);
    } else {
        ui.notifications.error("Another item of the type '" + targetEquipmentType + "' is already equipped");
    }

    await new Promise((r) => setTimeout(r, 100));
    if(targetItem.parent.sheet != null && targetItem.parent.sheet.rendered)
        targetItem.parent.sheet.render();
}

async function UnequipItem(targetItem){
    await targetItem.update({["system.props.active"] : false});

    await ConfigureAbilities(targetItem.parent, game.userId);

    await new Promise((r) => setTimeout(r, 100));
    if(targetItem.parent.sheet != null && targetItem.parent.sheet.rendered)
        targetItem.parent.sheet.render();
}