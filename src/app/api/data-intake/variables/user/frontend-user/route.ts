import { NextResponse } from 'next/server';

// Utility to test number parsing with sample data
function testNumberParsing() {
  const testValues = [
    0,
    "0",
    1,
    "1",
    1.5,
    "1.5",
    "1,5",
    100000,
    "100000",
    "100,000",
    null,
    undefined,
    "",
    "not-a-number"
  ];
  
  console.log("===== NUMBER PARSING TEST =====");
  testValues.forEach(val => {
    const numberVal = val !== null && val !== undefined ? Number(val) : null;
    console.log(`Value: ${val} (${typeof val})`);
    console.log(`  Parsed to number: ${numberVal} (${typeof numberVal})`);
    console.log(`  Is NaN: ${numberVal !== null && isNaN(numberVal)}`);
    console.log(`  ToString: ${String(val)}`);
    if (typeof val === 'string' && val.includes(',')) {
      const cleaned = val.replace(/,/g, '');
      const cleanedNum = Number(cleaned);
      console.log(`  Comma cleaned: ${cleaned} → ${cleanedNum} (isNaN: ${isNaN(cleanedNum)})`);
    }
    console.log("---");
  });
  console.log("=============================");
}

// Debug function to examine value types in a variable
function examineVariableValues(variable: any) {
  if (!variable || !variable.values || !Array.isArray(variable.values)) {
    console.log(`Variable ${variable?.name || 'unknown'} has no values array`);
    return;
  }
  
  console.log(`Variable ${variable.name} (${variable.id}) values examination:`);
  console.log(`Total values: ${variable.values.length}`);
  
  // Count value types
  const typeMap = new Map<string, number>();
  const valueMap = new Map<string, number>();
  
  variable.values.forEach((val: any) => {
    const valueType = typeof val.value;
    typeMap.set(valueType, (typeMap.get(valueType) || 0) + 1);
    
    // Check actual values, especially number-like strings
    if (valueType === 'string') {
      const stringVal = val.value;
      const key = stringVal === '0' ? 'zero' : 
                 stringVal === '' ? 'empty' :
                 !isNaN(Number(stringVal)) ? 'numeric' : 'other';
      valueMap.set(key, (valueMap.get(key) || 0) + 1);
    }
  });
  
  console.log('Value type distribution:');
  typeMap.forEach((count, type) => {
    console.log(`  ${type}: ${count}`);
  });
  
  if (typeMap.has('string')) {
    console.log('String value distribution:');
    valueMap.forEach((count, type) => {
      console.log(`  ${type}: ${count}`);
    });
    
    // Sample some values
    const stringValues = variable.values
      .filter((v: any) => typeof v.value === 'string')
      .slice(0, 5);
    
    console.log('Sample string values:');
    stringValues.forEach((v: any, i: number) => {
      console.log(`  ${i+1}. "${v.value}" → ${Number(v.value)} (date: ${v.date})`);
    });
  }
}

export async function GET() {
  try {
    console.log('GET /api/data-intake/variables/user/frontend-user - Direct endpoint called');
    
    // Run number parsing test
    testNumberParsing();
    
    const userId = "frontend-user";
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    console.log(`Backend URL being used: ${backendUrl}`);
    
    // Forward to backend
    try {
      const response = await fetch(`${backendUrl}/data-intake/variables/${userId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-store'
      });
      
      console.log(`Backend response status: ${response.status} ${response.statusText}`);
      
      const responseText = await response.text();
      console.log(`Backend response for hardcoded user ${userId} (raw length: ${responseText.length})`);
      
      // If the response is empty, return an empty array to prevent JSON parse errors
      if (!responseText || responseText.trim() === '') {
        console.log('Empty response received from backend');
        return NextResponse.json({ 
          message: 'No data returned from backend', 
          variables: [] 
        });
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed backend response - message:', data.message);
        console.log('Parsed backend response - count:', data.count);
        
        if (data.variables && Array.isArray(data.variables)) {
          console.log('Parsed backend response - variables count:', data.variables.length);
          
          if (data.variables.length > 0) {
            // Examine sample variables
            data.variables.slice(0, 2).forEach((variable: any, index: number) => {
              console.log(`Variable ${index+1} details:`);
              examineVariableValues(variable);
            });
            
            // Count string values vs number values across all variables
            let totalStringValues = 0;
            let totalNumberValues = 0;
            let totalNullValues = 0;
            let totalOtherValues = 0;
            let totalZeroValues = 0;
            
            data.variables.forEach((v: any) => {
              if (v.values && Array.isArray(v.values)) {
                v.values.forEach((val: any) => {
                  if (typeof val.value === 'string') totalStringValues++;
                  else if (typeof val.value === 'number') {
                    totalNumberValues++;
                    if (val.value === 0) totalZeroValues++;
                  }
                  else if (val.value === null) totalNullValues++;
                  else totalOtherValues++;
                });
              }
            });
            
            console.log('Value types across all variables:');
            console.log(`  String values: ${totalStringValues}`);
            console.log(`  Number values: ${totalNumberValues} (zeros: ${totalZeroValues})`);
            console.log(`  Null values: ${totalNullValues}`);
            console.log(`  Other types: ${totalOtherValues}`);
          }
        } else {
          console.log('No variables array found in the backend response');
        }
      } catch (e) {
        console.error('Failed to parse backend response JSON:', e);
        return NextResponse.json(
          { message: 'Failed to parse backend response', variables: [] },
          { status: 500 }
        );
      }
      
      if (!response.ok) {
        console.log('Backend response was not OK');
        return NextResponse.json(
          { message: data.message || 'Backend request failed', variables: [] },
          { status: response.status }
        );
      }
      
      // Before returning, check if we need to transform the data
      if (data && data.variables && Array.isArray(data.variables)) {
        // Check if values need parsing from strings to numbers
        const needsNumberParsing = data.variables.some((v: any) => 
          v.values && 
          v.values.length > 0 && 
          v.values.some((val: any) => typeof val.value === 'string')
        );
        
        if (needsNumberParsing) {
          console.log('Converting string values to numbers in the API response');
          
          data.variables = data.variables.map((variable: any) => ({
            ...variable,
            values: variable.values?.map((val: any) => {
              // Only convert if it's a string and looks like a number
              const value = 
                typeof val.value === 'string' && val.value !== '' && !isNaN(Number(val.value))
                  ? Number(val.value)
                  : val.value;
              
              return { ...val, value };
            })
          }));
        }
      }
      
      return NextResponse.json(data);
    } catch (fetchError) {
      console.error('Error fetching from backend:', fetchError);
      return NextResponse.json(
        { 
          message: fetchError instanceof Error ? fetchError.message : 'Backend connection error',
          details: "Could not connect to the backend server. Please ensure it's running.",
          variables: []
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json(
      { message: 'Internal server error', variables: [] },
      { status: 500 }
    );
  }
} 