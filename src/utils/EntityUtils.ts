export class EntityUtils {
    static generateRandomId(prefix: string = "none") {
        return `${prefix}-${Date.now()}-${Math.random()}`;
    }    
}
