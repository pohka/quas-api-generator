/**
  # overview
  version : 1.0
*/


/**
  ---
  Super class for all components
  ---

  @prop {Object} props - All the properties for this component
  @prop {Boolean} isPure - If true the component won't update once mounted
*/

class Component{
  /**
    @param {Object} props - All the properties for this component
  */
  constructor(props){
    if(props){
      this.props = props;
    }
    else{
      this.props = {}
    }
    this.isPure = false;
  }


  /**
    ---
    Sets the properties and updates the component
    ---

    @param {Object} props - The properties to change or add

    ```
    myComp.setProps({
      name : "john",
      id : 123
    });
    ```
  */
  setProps(obj){
    for(let k in obj){
      this.props[k] = obj[k];
    }
    Quas.render(this);
  }


  /**
    ---
    Returns true if this component has been mounted to the DOM tree
    ---

    @return {Boolean}

    ```
    console.log(comp.isMounted()); //false;
    Quas.render(comp, "#app");
    console.log(comp.isMounted()); //true
    ```
  */
  isMounted(){
    return this.dom !== undefined;
  }

  /**
    Removes the component from the DOM tree
  */
  unmount(){
    if(this.dom){
      this.dom.remove();
      this.dom = undefined;
    }
    this.vdom = undefined;
  }
}
