// Game Data
export const wordData = {
    programming: { words: ['javascript', 'interface', 'developer', 'element', 'function', 'variable', 'algorithm'], icon: '💻' },
    animals: { words: ['elephant', 'giraffe', 'penguin', 'crocodile', 'hippopotamus', 'chimpanzee', 'rhinoceros'], icon: '🐘' },
    countries: { words: ['switzerland', 'australia', 'brazil', 'canada', 'denmark', 'egypt', 'argentina'], icon: '🌍' },
    food: { words: ['spaghetti', 'broccoli', 'strawberry', 'pineapple', 'chocolate', 'avocado', 'pancake'], icon: '🍔' },
    science: { words: ['astronomy', 'chemistry', 'genetics', 'molecule', 'photosynthesis', 'gravity', 'galaxy'], icon: '🔬' },
    sports: { words: ['basketball', 'volleyball', 'gymnastics', 'badminton', 'archery', 'fencing', 'cricket'], icon: '🏀' }
};

export const difficultySettings = {
    easy:   { time: 120, hints: true, icon: '😊' },
    medium: { time: 90,  hints: true, icon: '🤔' },
    hard:   { time: 60,  hints: false, icon: '💀' }
};

export const dailyChallengeWords = [
    'synergy', 'paradigm', 'juxtaposition', 'quixotic', 'ephemeral', 'mnemonic', 'ubiquitous',
    'zeitgeist', 'ambiguous', 'boulevard', 'chrysanthemum', 'conscientious', 'dichotomy'
];

export function getAllWords() {
    return Object.values(wordData).flatMap(category => category.words);
}