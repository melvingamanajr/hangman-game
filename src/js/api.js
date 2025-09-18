export async function getWordDefinition(word) {
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        if (!response.ok) {
            return 'No definition found for this word.';
        }
        const data = await response.json();
        // Extract the first definition from the first meaning
        const definition = data[0]?.meanings[0]?.definitions[0]?.definition;
        return definition || 'No definition found for this word.';
    } catch (error) {
        console.error('Error fetching definition:', error);
        return 'Could not retrieve definition at this time.';
    }
}