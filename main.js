const fs = require('fs');

let folder = "./docs/";
let args = process.argv.slice(2);
if(args[0]){
  folder = args[0];
}
let allDocs;
let fileCount = 0;
console.log("--------------------------");
//read all files in directory
fs.readdir(folder, (err, files) => {
  files.forEach(filename => {
    fileCount += 1;
    console.log("parsing: " + folder+filename);
    parse(folder+filename).then((data) =>{
      appendAllDocs(data);
      fileCount -= 1;
      if(fileCount == 0){
        output(allDocs);
      }
    });
  });
});

//append the data parsed form the file to the allDocs
function appendAllDocs(data){
  if(!allDocs){
    allDocs = data;
    return;
  }
  for(let i in data){
    if(i != "docs"){
      allDocs[i] = data[i];
    }
    else{
      for(let a in data[i]){
        allDocs[i].push(data[i][a]);
      }
    }
  }
}

//parse a file
function parse(filename){
  return new Promise(function(resolve, reject) {
    fs.readFile(filename, "utf8", function(err,data){
     if(err){
       return console.log(err);
      }

      //should remove comments here, incase there is a curly bracket in a comment

      let docs = [];
      let lines = data.split("\n");
      let opened = false;
      let content = "";
      let inClassScope = false;
      let bracketCount = 0;
      let reachedFirstBracket = false;
      let currentClass;
      let all = {};

      for(let i=0; i<lines.length; i++){
        if(lines[i].indexOf("/**") > -1){
          opened = true;
        }
        else if(opened && lines[i].indexOf("*/") > -1){
          let res = parseContent(content);
          if(res.type && res.type == "overview"){
            all = parseOverview(content);
          }
          if(Object.keys(res).length > 0){
            if(!res.type || res.type != "overview"){
              //find the next line that is not empty
              //get the signature from the found line
              let foundNextLine = false;
              while(i<lines.length && !foundNextLine){
                i++;
                if(lines[i].search(/\S/) > -1){
                  let signature = parseCodeLine(lines[i]);
                  for(let a in signature){
                    res[a] = signature[a];
                  }
                  foundNextLine = true;
                }
              }


              if(res.type == "class"){
                inClassScope = true;
                reachedFirstBracket = false;
                currentClass = res;
                delete currentClass.params;
                delete currentClass.isStatic;
                delete currentClass.return;
                currentClass.funcs = [];
                bracketCount = 0;
              }

              else if(res.type == "function"){
                delete res.props;
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

      all.docs = docs;
      resolve(all);
    });
  });
}

//output the data
function output(all){
  fs.writeFile("./output.json", JSON.stringify(all), function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("\n--------------------------\nDocumentation generated!\n--------------------------");
  });
}

function parseOverview(text){
  let obj = {};
  let lines = text.split("\n");
  for(let i=0; i<lines.length; i++){
    let index = lines[i].indexOf(":");
    if(index > -1){
      let key = lines[i].substr(0,index).trim();
      let val = lines[i].slice(index+1).trim();
      obj[key] = val;
    }
  }
  return obj;
}

function parseCodeLine(line){
  let arr = line.split("{")[0].split(/\s+/);
  let signature = {
    type : "",
    name : "",
    isStatic : false
  };
  if(line.indexOf("(") > -1){
    signature.type = "function";
  }
  else{
    signature.type = "class";
    signature.super = "";
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
  - props
  - return
*/
function parseContent(text){
  let lines = text.split("\n");
  let initalSpaces;
  let info = {
    type : "",
    desc : "",
    code : "",
    params : [],
    props : [],
    return : []
  };
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
      else if(trimmedLine.indexOf("@param") == 0 || trimmedLine.indexOf("@prop") == 0){
        let exclude = false;
        //find the description of the param
        let key = trimmedLine.split(/\s+/)[0].slice(1) + "s"; //params or props
        let els = trimmedLine.split("-");
        let paramInfo = {};
        if(els.length > 1){
          let match = els[1].trim().match(/\(.*?\)/);
          if(match && match.index == 0){
            let text = match[0].substr(1, match[0].length-2);
            if(text == "optional"){
              paramInfo.optional = true;
            }
            else if(text == "exclude"){
              exclude = true;
            }

            paramInfo.desc = els[1].replace(match[0], "").trim();
          }
          //add the description
          else{
            paramInfo.desc = els[1];
          }
        }

        if(exclude == false){
          let rightSide = trimmedLine.split("}")[1];
          paramInfo.name = rightSide.split("-")[0].trim();
          //find the param type
          let match = trimmedLine.match(/\{.*?\}/);
          if(match){
            let paramType = match[0].substr(1,match[0].length-2);
            paramInfo.types = paramType.split("|");

            if(!info[key]){
              info[key] = [];
            }
            info[key].push(paramInfo);
          }
        }
      }

      //return type
      else if(trimmedLine.indexOf("@return") == 0){
        let match = trimmedLine.match(/\{.*?\}/);
        let returnType = match[0].substr(1,match[0].length-2);
        let returnArr = returnType.split("|");
        info.return = returnArr;
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
