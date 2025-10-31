
/**
 * Represents a dictionary that can hold words and definitions.
 */
export class Dictionary {
    /**
     * Creates a new Dictionary with no definitions.
     */
    constructor() {
        this.dictionary = {}
    }

    /**
     * Set the definition of a word in the dictionary. Allows overwriting of existing definitions.
     * 
     * Words are case-insensitive, and are stored in lowercase only.
     * @param {string} word
     * @param {string} definition 
     */
    write(word, definition) {
        const lowercaseWord = word.toLowerCase()
        this.dictionary[lowercaseWord] = definition
    }

    /**
     * Read the definition of a word from the dictionary. Uses a case-insensitive search.
     * @param {string} word 
     * @returns {string | null} the definition, or null if the word is not in the dictionary.
     */
    read(word) {
        const lowercaseWord = word.toLowerCase()
        const definition = this.dictionary[lowercaseWord]

        if (definition === undefined) {
            return null
        } else {
            return definition
        }
    }

    /**
     * Get the number of entries in the dictionary.
     * @returns the number of entries in the dictionary.
     */
    size() {
        return Object.keys(this.dictionary).length
    }

    /**
     * Checks if the given string is a valid string to insert into the dictionary.
     * @param {string} str 
     * @returns {boolean} True if the string is valid, false otherwise.
     */
    static stringIsValid(str) {
        if (typeof str !== "string") return false

        if (/\d/.test(str)) return false

        str = str.trim()

        if (str.length === 0) return false

        return true
    }
}
