/**
 * MongoDB Query Sanitization Utility
 * Prevents NoSQL injection attacks
 */

export class QuerySanitizer{
  // Dangerous MongoDB operators that should be removed from user input
  private static readonly DANGEROUS_OPERATORS=[
    '$where','$regex','$ne','$gt','$gte','$lt','$lte',
    '$in','$nin','$or','$and','$not','$nor','$exists',
    '$type','$mod','$all','$size','$elemMatch',
    '$slice','$push','$pull','$pop','$unset',
    '$inc','$mul','$rename','$setOnInsert','$min','$max',
    '$currentDate','$addToSet','$pullAll','$each','$position'
  ];

  /**
   * Sanitize an object by removing MongoDB operators
   */
  static sanitize(input:any):any{
    if(input===null||input===undefined)return input;

    // Handle arrays
    if(Array.isArray(input)){
      return input.map(item=>this.sanitize(item));
    }

    // Handle objects
    if(typeof input==='object'){
      const sanitized:any={};
      
      for(const key in input){
        // Skip dangerous operators
        if(this.isDangerousOperator(key)){
          continue;
        }

        // Recursively sanitize nested objects
        sanitized[key]=this.sanitize(input[key]);
      }

      return sanitized;
    }

    // Return primitives as-is
    return input;
  }

  /**
   * Check if a key is a dangerous MongoDB operator
   */
  private static isDangerousOperator(key:string):boolean{
    return key.startsWith('$') && this.DANGEROUS_OPERATORS.includes(key);
  }

  /**
   * Sanitize query parameters from req.query or req.body
   */
  static sanitizeQuery(query:any):any{
    return this.sanitize(query);
  }

  /**
   * Validate that a value doesn't contain operators
   */
  static isClean(value:any):boolean{
    if(value===null||value===undefined)return true;

    if(Array.isArray(value)){
      return value.every(item=>this.isClean(item));
    }

    if(typeof value==='object'){
      return Object.keys(value).every(key=>{
        return !key.startsWith('$') && this.isClean(value[key]);
      });
    }

    return true;
  }

  /**
   * Escape special regex characters
   */
  static escapeRegex(str:string):string{
    return str.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  }

  /**
   * Validate MongoDB ObjectId format
   */
  static isValidObjectId(id:string):boolean{
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  /**
   * Sanitize string for safe regex use
   */
  static sanitizeForRegex(str:string):string{
    // Remove any regex operators
    return str.replace(/[\^$.*+?{}()|\[\]\\]/g,'');
  }

  /**
   * Create a safe query object with type checking
   */
  static createSafeQuery(params:Record<string,any>):Record<string,any>{
    const safeQuery:Record<string,any>={};

    for(const key in params){
      const value=params[key];

      // Skip operators
      if(key.startsWith('$'))continue;

      // Ensure value is clean
      if(this.isClean(value)){
        safeQuery[key]=value;
      }
    }

    return safeQuery;
  }

  /**
   * Validate and sanitize search input
   */
  static sanitizeSearchInput(search:string):string{
    if(!search||typeof search!=='string')return '';

    // Remove operators and special characters
    return search
      .replace(/[\$\{\}]/g,'') // Remove $, {, }
      .replace(/[<>]/g,'') // Remove HTML-like characters
      .trim()
      .substring(0,200); // Limit length
  }

  /**
   * Validate array input
   */
  static sanitizeArray(arr:any[],maxLength:number=100):any[]{
    if(!Array.isArray(arr))return[];
    
    return arr
      .slice(0,maxLength) // Limit array size
      .map(item=>this.sanitize(item))
      .filter(item=>item!==null && item!==undefined);
  }

  /**
   * Sanitize pagination parameters
   */
  static sanitizePagination(page:any,limit:any,maxLimit:number=100):{page:number,limit:number}{
    const safePage=Math.max(1,parseInt(page)||1);
    const safeLimit=Math.min(maxLimit,Math.max(1,parseInt(limit)||10));

    return{page:safePage,limit:safeLimit};
  }
}

export default QuerySanitizer;

