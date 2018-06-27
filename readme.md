# Quas API Generator
This will generate a JSON file from all the files in a given directory.

## Markdown
## Functions
````js
/**
  ---
  my function description
  ---

  ```
  sample('john', 21);
  ```

  @param {String} name - the param description
  @param {Number|String} info - another param description

  @return {String}
*/

function sample(name, info){
  return name + " is " + info;
}
````

this will generate into this:
```json
{
  "type" : "function",
  "name" : "sample",
  "isStatic" : false,
  "desc" : "my function description",
  "code" : "sample('john', 21);",
  "params" : [
    {
      "types" : ["String"],
      "name" : "name",
      "desc" : "the param description"
    },
    {
      "types" : ["Number", "String"],
      "name" : "age",
      "desc" : "another param description"
    }
  ],
  "return" : ["String"]
}
```

### Class
```js
/*
  ---
  Shiba inu
  ---

  @props {Number} legs - number of leg
*/
class Dog{
  constructor(){
    this.legs = 4;
  }
}
```
Note how the constructor function is added to the funcs key
```JSON
{
  "type" : "function",
  "name" : "Dog",
  "desc" : "Shiba inu",
  "code" : "",
  "props" : [
    {
      "types" : ["Number"],
      "name" : "legs",
      "desc" : "number of leg"
    }
  ],
  "funcs" : [
    {
      "type" : "function",
      "name" : "constructor",
      "isStatic" : false,
      "desc" : "",
      "code" : "",
      "params" : [],
      "return" : []
    }
  ]
}
```

### Overview
The overview can only be defined once throughout all your files. You can set some extra variables to your output

```js
/**
  # overview
  version : 1.0
  date : 01/01/2018
*/
```

## Output file
The final file will put all the classes and functions into the docs key and save it as output.json
```JSON
{
  "version" : "1.0",
  "date" : "01/01/2018",
  "docs" : [
    ...
  ]
}
```


## Usage
This command will parse all the files in the ./sample/ folder
```
node main ./sample/
```

By default the script will parse ./docs/
```
node main
```

## Requirement
Install Node.js

## Todo
* return needs to be an array
* (optional) params
* (exclude) params
* ignore
* modules markdown
