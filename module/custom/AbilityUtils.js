export default async function SetupAbilities() {
    Hooks.on('updateActor', (actor, changed, options, userId) => ConfigureAbilities(actor, userId));
    Hooks.on('init', SetupGlobalFunctions)
}

export const ConfigureAbilities = async (actor, userId) => {
    
    //If we didn't initializez the change for this configure, we don't configure, because whoever initialized it is the one configuring.
    if(userId != game.userId)
        return;

    /**
     * A map of all abilities that this actor wants.
     * Configure functions should put ability data here.
     * At the end of the function, all abilities that exist here that aren't on the actor will be created,
     * and any configured abilities that aren't in this list will be removed.
     */
    const wantedAbilities = {};

    await ConfigureDefaultAbilities(wantedAbilities, actor);
    await ConfigureItemAbilities(wantedAbilities, actor);
    
    await FinalizeConfiguredAbilities(wantedAbilities, actor);
    
    //Wait for a moment, then re-render the sheet on this client.
    await new Promise((r) => setTimeout(r, 100));
    if(actor.sheet != null && actor.sheet.rendered)
        actor.sheet.render();
}

async function FinalizeConfiguredAbilities(abilities, actor){
    
    // Map of all configured abilities currently on the actor.
    let existingAbilities = {};
    for (const item of actor.items) {
        if (item.system.template != abilityTemplateId)
            continue;
            
        if(!item.system.configured)
            continue;

        existingAbilities[item.system.uniqueId] = item;
    }


    // Delete all configured abilities that aren't needed.
    {
        // Map of all abilities (by item ID) that need to be deleted.
        let deletedAbilities = [];
        
        //Iterate existing abilities
        for(const id in existingAbilities){
            //If this ability is in the ability list, skip it, since we want to keep it.  
            if(abilities[id] != null)
                continue;
                
            //Delete the ability if it's not in the ability list.
            deletedAbilities.push(existingAbilities[id]._id);
        }
        
        await actor.deleteEmbeddedDocuments("Item", deletedAbilities, {broadcast:true});
    }
    
    // Create any missing abilities.
    {
        // Array of all abilities (as objects) that need to be created.
        let createdAbilities = [];
        
        for(const abilityId in abilities)
            createdAbilities.push(abilities[abilityId]);
            
        await actor.createEmbeddedDocuments("Item", createdAbilities, {broadcast:true});
    }
    
}

async function GenerateConfiguredAbility(documentId, uniqueId){
    const document = await fromUuid(documentId);
    
    if(document == null)
        return null;
        
    if(uniqueId == null)
        uniqueId = documentId;
        
    var dataObject = document.toObject();
    delete dataObject._id;
    
    //Sets the object to be configured so we can find it later.
    dataObject.system.configured = true;
    dataObject.system.unique = true;
    dataObject.system.uniqueId = uniqueId;
    
    return dataObject;
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
 * Configures default abilities, which all entities should have.
 */
async function ConfigureDefaultAbilities(abilityList, actor) {
    for(const id of defaultAbilityIds){
        
        const configured = await GenerateConfiguredAbility(id);
        if(configured != null)
            abilityList[id] = configured;
    }
}

/**
 * Configures abilities that come from items.
 */
async function ConfigureItemAbilities(abilityList, actor) {
    for (const item of actor.items) {
        const itemAbilities = item.system.props.item_abilities;
        if (!itemAbilities)
            continue;
            
        //Skip items that aren't active.
        if (!item.system.props.active)
            continue;
            
        //Loop all abilities on the item.
        for (const abilityIndex in itemAbilities) {
            const abilityEntry = itemAbilities[abilityIndex];

            if (abilityEntry.deleted)
                continue;
            
            //Generate a unique ID using this item's ID and the ID of the ability we're wanting to copy.
            const abilityId = abilityEntry.abilityId + "_<" + item._id + ">";
            
            //Generate a copy and add it to the ability list
            const generatedAbility = await GenerateConfiguredAbility(abilityEntry.abilityId, abilityId);
            if(generatedAbility != null)
                abilityList[abilityId] = generatedAbility;
        }
    }
}

async function SetupGlobalFunctions() {
    game.globalFunctions["declareAbility"] = DeclareAbility;
    game.globalFunctions["undeclareAbility"] = UndeclareAbility;
    game.globalFunctions["resolveAbility"] = ResolveAbility;
    game.globalFunctions["countAbilities"] = CountAbilities;
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
        await ability.update({ ['system.props.cooldown']: ability.system.props.recoveryTime });

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

export const CountAbilities = (actor, predicate) => {

    let count = 0;

    for(const item of actor.items){

        //Skip non-abilities.
        if (item.system.template != abilityTemplateId)
            continue;
        //Skip anything configured.
        if(item.system.configured)
            continue;
        //Skip items not matching the predicate.
        if(!predicate(item))
            continue;

        count++;
    }

    return count;
}