
export default async function SetupGeneral() {
    Hooks.on('init', SetupGlobalFunctions)
}

async function SetupGlobalFunctions() {
    game.globalFunctions["getRarityText"] = GetRarityText;
}


const rarityText = {
    Common: "#000000",
    Uncommon: "#388a4f",
    Rare: "#743db8",
    Legendary: "#c91c1c",
};

function GetRarityText(rarity) {
    return rarityText[rarity] ?? rarityText.Common;
}