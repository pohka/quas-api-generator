

const fs = require('fs');
fs.readFile("./docs/quas.js", "utf8", function(err,data){
  if(err){
    return console.log(err);
  }

  let docs = [];
  let lines = data.split("\n");
  let opened = false;
  let content = "";
  let inClassScope = false;
  let bracketCount = 0;
  let reachedFirstBracket = false;
  let currentClass;

  for(let i=0; i<lines.length; i++){
    if(lines[i].indexOf("/**") > -1){
      opened = true;
    }
    else if(opened && lines[i].indexOf("*/") > -1){
      let res = parseContent(content);
      if(Object.keys(res).length > 0){
        if(res.type != "overview"){
          //find the next line that is not empty
          //get the signature from the found line
          let foundNextLine = false;
          while(i<lines.length && !foundNextLine){
            i++;
            if(lines[i].search(/\S/) > -1){
              res.signature = parseCodeLine(lines[i]);
              foundNextLine = true;
            }
          }


          if(res.signature.type == "class"){
            inClassScope = true;
            reachedFirstBracket = false;
            currentClass = res;
            currentClass.funcs = [];
            bracketCount = 0;
          }

          else if(res.signature.type == "function"){
            //add if just a stray function
            if(!inClassScope){
              docs.push(res);
            }
            //add function to class
            else{
              currentClass.funcs.push(res);
            }
          }
        }
      }
      opened = false;
      content = "";
    }
    else if(opened){
      if(content == ""){
        content += lines[i];
      }
      else{
        content += "\n" + lines[i];
      }
    }

    //outside code block
    if(!opened){
      //in the scope of a class
      if(inClassScope){
        //this line has the opening bracket of the class
        if(!reachedFirstBracket){
          if(lines[i].indexOf("{") > -1){
            reachedFirstBracket = true;
          }
        }
        //count and update the current number of brackets
        let openBrackets = lines[i].match(/{/g);
        let closeBrackets = lines[i].match(/}/g);
        if(openBrackets != null){
          bracketCount += openBrackets.length;
        }
        if(closeBrackets != null){
          bracketCount += -closeBrackets.length;
        }
        //if scope of class has closed
        if(reachedFirstBracket && bracketCount <= 0){
          docs.push(currentClass);
          inClassScope = false;
        }
      }
    }

  }//end of loop

  console.log(docs);
});

function parseCodeLine(line){
  let arr = line.split("{")[0].split(/\s+/);
  let signature = {};
  if(line.indexOf("(") > -1){
    signature.type = "function";
  }
  else{
    signature.type = "class";
  }

  //class line
  if(signature.type == "class"){
    for(let i=0; i<arr.length; i++){
      if(i+1 < arr.length){
        if(arr[i] == "class"){
          signature.name = arr[i+1];
        }
        else if(arr[i] == "extends"){
          signature.super = arr[i+1];
        }
      }
    }
  }

  //function line
  else{
    let hasMatch = false;

    /*
    mathces:
      function test(){}
      test()
    */
    let match = line.match(/\S+\(|\S+\s+\(/);
    if(match){
      signature.name = match[0].split("(")[0].trim();
      hasMatch = true;
    }

    /*
    matches:
      var test = function()
      test : function()
    */
    if(!hasMatch){
      let match2 = line.match(/function\s+\(|function\(/);
      if(match2){
        let leftSide = line.split(/=|:/)[0].split(/\s+/);
        signature.name = leftSide[leftSide.length-1];
        hasMatch = true;
      }
    }

    /*
    matches:
      var test = () => {}
    */
    if(!hasMatch){
      let index = line.indexOf("=");
      if(index > -1){
        let leftSide = line.substr(0, index);
        let els = leftSide.split(/\s+/);
        signature.name = els[els.length-1];
        hasMatch = true;
      }
    }


    if(hasMatch && arr[0] == "static" || arr[1] == "static"){
      signature.isStatic = true;
    }
  }

  return signature;
}

/*
parses a documentation block like so:
  # type
  ---
  description
  ---

  ```
  code block
  ```

  @param {type!type} - description
  @return {type}



returns Object with the following structure:
  - type
  - desc
  - code
  - params
    - types
    - desc
  - return

all of the keys can be undefined
*/
function parseContent(text){
  let lines = text.split("\n");
  let initalSpaces;
  let info = {};
  let descriptionOpen = false;
  let codeOpen = false;
  let description = "";
  let code = "";

  for(let i=0; i<lines.length; i++){
    //number of spaces at the start of the line
    let spaces = lines[i].search(/\S/);

    //set initalSpaces based on the first line
    if(!initalSpaces && spaces > -1){
      initalSpaces = spaces;
    }
    //if line has characters that are not spaces
    if(initalSpaces){
      let line = lines[i].substr(initalSpaces);
      let trimmedLine = lines[i].trim();

      //type
      if(trimmedLine.charAt(0) == "#"){
        let type = trimmedLine.substr(1).trim();
        if(type == "func"){ //alias
          type = "function";
        }
        info.type = type;
      }

      //parameter
      else if(trimmedLine.indexOf("@param") == 0){
        //find the description of the param
        let els = trimmedLine.split("-");
        let paramInfo = {};
        if(els.length > 1){
          paramInfo.desc = els[1];
        }
        //find the param type
        let match = trimmedLine.match(/\{.*?\}/);
        if(match){
          let paramType = match[0].substr(1,match[0].length-2);
          paramInfo.types = paramType.split("|");
        }

        if(paramInfo.type){
          if(!info.params){
            info.params = [];
          }
          info.params.push(paramInfo);
        }
      }

      //return type
      else if(trimmedLine.indexOf("@return") == 0){
        let match = trimmedLine.match(/\{.*?\}/);
        let returnType = match[0].substr(1,match[0].length-2);
        info.return = returnType;
      }

      //start or end of description block
      else if(trimmedLine.substr(0,3) == "---"){
        descriptionOpen = !descriptionOpen;
        if(!descriptionOpen){
          //on close description block
          info.desc = description;
          description = "";
        }
      }

      //start or end of code block
      else if(trimmedLine.substr(0,3) == "```"){
        codeOpen = !codeOpen;
        //on close code block
        if(!codeOpen){
          info.code = code;
          code = "";
        }
      }

      else if(descriptionOpen){
        if(description == ""){
          description += line;
        }
        else {
          description += "\n" + line;
        }
      }

      else if(codeOpen){
        if(code == ""){
          code += line;
        }
        else{
          code += "\n" + line;
        }
      }
    }
  }
  return info;
}
