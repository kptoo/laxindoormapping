const ICON_CONFIG = {
    gates: { icon: 'departure_1417770.png', size: 0.8 },
    shops: { icon: 'shop_1122265.png', size: 0.7 },
    food_beverage: { icon: 'restaurant_1818179.png', size: 0.7 },
    restrooms: { icon: 'women_3159430.png', size: 0.7 },
    services: { icon: 'information_1166169.png', size: 0.7 },
    service: { icon: 'information_1166169.png', size: 0.7 },
    vertical_circulation: { icon: 'elevator_6767038.png', size: 0.7 },
    shuttle: { icon: 'baggage_13881510.png', size: 0.8 },
    bus: { icon: 'baggage_13881510.png', size: 0.8 },
    parking: { icon: 'baggage_13881510.png', size: 0.8 },
    atm: { icon: 'atm-machine_9039308.png', size: 0.7 },
    charging: { icon: 'charging-location_7574331.png', size: 0.7 },
    checkin: { icon: 'checkin_10124220.png', size: 0.7 },
    water: { icon: 'clean-water_8061495.png', size: 0.7 },
    security: { icon: 'security_9335739.png', size: 0.7 },
    firstaid: { icon: 'first-aid-kit_2002568.png', size: 0.7 },
    faith: { icon: 'faith_7239580.png', size: 0.7 },
    wellness: { icon: 'wellness_15310024.png', size: 0.7 },
    elevator: { icon: 'elevator_6767038.png', size: 0.7 },
    stairs: { icon: 'stairs_8566981.png', size: 0.7 },
    escalator: { icon: 'escalator_491739.png', size: 0.7 },
    men: { icon: 'men_46432.png', size: 0.7 },
    women: { icon: 'women_3159430.png', size: 0.7 }
};

const ICON_BASE_PATH = 'icons/';

function getIconForFeature(featureType, properties) {
    if (featureType === 'restrooms') {
        const type = (properties.type || '').toLowerCase();
        if (type === 'men' || type === 'male') return ICON_CONFIG.men.icon;
        if (type === 'women' || type === 'female') return ICON_CONFIG.women.icon;
        return ICON_CONFIG.restrooms.icon;
    }
    
    if (featureType === 'vertical_circulation') {
        const name = (properties.name || '').toLowerCase();
        if (name.includes('elevator')) return ICON_CONFIG.elevator.icon;
        if (name.includes('stair')) return ICON_CONFIG.stairs.icon;
        if (name.includes('escalator')) return ICON_CONFIG.escalator.icon;
        return ICON_CONFIG.vertical_circulation.icon;
    }
    
    if (featureType === 'service') {
        const type = (properties.type || '').toLowerCase();
        if (ICON_CONFIG[type]) return ICON_CONFIG[type].icon;
    }
    
    return ICON_CONFIG[featureType]?.icon || ICON_CONFIG.service.icon;
}

function getIconSize(featureType, properties) {
    if (featureType === 'restrooms') {
        const type = (properties.type || '').toLowerCase();
        if (type === 'men' || type === 'male') return ICON_CONFIG.men.size;
        if (type === 'women' || type === 'female') return ICON_CONFIG.women.size;
    }
    
    if (featureType === 'vertical_circulation') {
        const name = (properties.name || '').toLowerCase();
        if (name.includes('elevator')) return ICON_CONFIG.elevator.size;
        if (name.includes('stair')) return ICON_CONFIG.stairs.size;
        if (name.includes('escalator')) return ICON_CONFIG.escalator.size;
    }
    
    if (featureType === 'service') {
        const type = (properties.type || '').toLowerCase();
        if (ICON_CONFIG[type]) return ICON_CONFIG[type].size;
    }
    
    return ICON_CONFIG[featureType]?.size || 0.7;
}