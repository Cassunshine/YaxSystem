export default async function SetupAbilities() {
    Hooks.on('updateActor', (actor, changed, options, userId) => ConfigureAbilities(actor, userId));
    Hooks.on('init', SetupGlobalFunctions)
}

export const ConfigureAbilities = async (actor, userId) => {
    await ConfigureDefaultAbilities(actor, userId);
    await ConfigureItemAbilities(actor, userId);

    if(actor.sheet != null && actor.sheet.rendered)
        actor.sheet.render();
}

const abilityTemplateId = "DkgYZdbdwKYJ7cxD";
const defaultAbilityIds = [
    "Item.RKygCkz8BjWybc77",
    "Item.QWCgQkr29c0tGbYc",
    "Item.HJBXgCbQQDfhLQA7",
    "Item.wtwxOvUBFp3NMgRx",
    "Item.ZlUg5WuHoXp1SJKJ"
];

/**
 * Configures an actor's abilities, ensuring that they have the default abilities an actor should have.
 */
async function ConfigureDefaultAbilities(actor, userId) {
    if (userId != game.userId)
        return;

    await createAbilitiesIfNotPresent(actor, defaultAbilityIds, (ability) => ability.system.props.displayType == `default`);
}

/**
 * Configures an actor's abilities, giving or taking any item abilities as needed.
 */
async function ConfigureItemAbilities(actor, userId) {
    if (userId != game.userId)
        return;

    let allAbilities = [];

    for (const item of actor.items) {
        const itemAbilities = item.system.props.item_abilities;

        if (!itemAbilities)
            continue;

        if (!item.system.props.active)
            continue;

        for (const abilityIndex in itemAbilities) {
            const itemAbility = itemAbilities[abilityIndex];

            if (itemAbility.deleted)
                continue;

            allAbilities.push(itemAbility.abilityId);
        }
    }

    await createAbilitiesIfNotPresent(actor, allAbilities, (ability) => ability.system.props.displayType == `item`);

}

async function createAbilitiesIfNotPresent(actor, abilityUuids, predicate) {
    // Map of all abilities (by unique ID -> item ID) that are currently on the actor.
    let existingAbilities = {};

    //Map of all abilities (by item ID) that need to be deleted.
    //By default, contains all abilities.
    //Any abilities left in this at the end of the function will be removed.
    let deletedAbilities = {};

    //Array of all abilities (as objects) that need to be created.
    let createdAbilities = [];

    //Iterate over all items of the actor, filtering out all abilities.
    for (const item of actor.items) {
        if (item.system.template != abilityTemplateId)
            continue;

        if (!item.system.unique)
            continue;
        
        //Ignore predicate-failing items
        if (!predicate(item))
            continue;

        existingAbilities[item.system.uniqueId] = item._id;
        deletedAbilities[item._id] = true;
    }

    //Iterate over all the abilities we want to create.
    for (const abilityUuid of abilityUuids) {
        const abilityDocument = await fromUuid(abilityUuid);

        if (!abilityDocument)
            continue;

        //Ignore non-unique abilities.
        if (!abilityDocument.system.unique) {
            ui.notifications.error("Item abiltiy must be unique to add to player! ID is : " + itemAbility.abilityId);
            continue;
        }

        const uniqueId = abilityDocument.system.uniqueId;
        const existing = existingAbilities[uniqueId];

        //If ability already exists...
        if (existing != null) {
            //If the delete list has this ability, remove it. We want to keep it.
            if (deletedAbilities[existing])
                delete deletedAbilities[existing];

            //Do nothing else, as the ability already exists on the entity.
        } else {
            const newAbility = abilityDocument.toObject();
            delete newAbility._id;

            createdAbilities.push(newAbility);

            //Record it as existing on the entity so we don't make multiple.
            existingAbilities[uniqueId] = 0;
        }
    }


    //Create new abilities.
    {
        if (createdAbilities.length > 0)
            console.log("Created: ", await actor.createEmbeddedDocuments("Item", createdAbilities, { broadcast: true }));
    }


    //Delete unused abilities.
    {
        let itemList = [];

        for (const deleted in deletedAbilities)
            itemList.push(deleted);

        if (itemList.length > 0)
            console.log("Removed: ", await actor.deleteEmbeddedDocuments("Item", itemList, { broadcast: true }));
    }
}

async function SetupGlobalFunctions() {
    game.globalFunctions["declareAbility"] = DeclareAbility;
    game.globalFunctions["undeclareAbility"] = UndeclareAbility;
    game.globalFunctions["resolveAbility"] = ResolveAbility;
}

export const DeclareAbility = async (ability) => {
    if (ability.system.props.cooldown > 0) {
        ui.notifications.error("This ability is still on cooldown!");
        return;
    }

    await ability.update({ ['system.props.isDeclared']: true, ['system.props.isDelayed'] : false });
}

export const UndeclareAbility = async (ability) => {
    await ability.update({ ['system.props.isDeclared']: false });
}

export const ResolveAbility = async (ability) => {
    await UndeclareAbility(ability);

    let content = "<p style=\"text-align: center;\">Resolve ability <b>@UUID[" + ability.uuid + "]</b></p>";

    if (ability.parent.inCombat) {
        await ability.update({ ['system.props.cooldown']: ability.system.props.useTime });

        if (ability.system.props.encounterDescription)
            content += "</br>" + ability.system.props.encounterDescription;
    } else {
        if (ability.system.props.downtimeDescription)
            content += "</br>" + ability.system.props.downtimeDescription;
    }

    const chatData = {
        user: game.user._id,
        speaker: {
            actor: ability.parent._id,
            alias: ability.parent.name,
        },
        content: content,
    };

    ChatMessage.create(chatData, {});
}