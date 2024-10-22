const character = scope._templateSystem.entity;

await new Promise(r => setTimeout(r, 100));

let existingAbilities = {};
let createdAbilities = [];

// Find all item abilities
for(const item of character.items){
    if(item.system.props.displayType != "item")
        continue;
    
    if(!item.system.unique)
        continue;

    existingAbilities[item.system.uniqueId] = item._id;
}

//console.log(existingAbilities);

for(const item of character.items){
    const itemAbilities = item.system.props.item_abilities;

    if(!itemAbilities)
        continue;

    if(!item.system.props.active)
        continue;

    for(const abilityIndex in itemAbilities){
        const itemAbility = itemAbilities[abilityIndex];

        if(itemAbility.deleted)
            continue;

        const actualAbility = await fromUuid(itemAbility.abilityId);
        //console.log(actualAbility.toObject());
        if(!actualAbility.system.unique){
            ui.notifications.error("Item abiltiy must be unique to add to player! ID is : " + itemAbility.abilityId );
            continue;
        }

        if(existingAbilities[actualAbility.system.uniqueId] == null){
            const created = actualAbility.toObject();
            delete created._id;
            createdAbilities.push(created);
        }

        delete existingAbilities[actualAbility.system.uniqueId];
    }
}

//console.log(existingAbilities);

let itemList = [];

for(const removedId in existingAbilities){
    itemList.push(existingAbilities[removedId]);
}

let removed = await character.deleteEmbeddedDocuments("Item", itemList);
//console.log("Removed:" , removed);

let created = await character.createEmbeddedDocuments("Item", createdAbilities);
//console.log("Created:" , created);

await new Promise(r => setTimeout(r, 50));

if(character.sheet)
    character.sheet.render(true);