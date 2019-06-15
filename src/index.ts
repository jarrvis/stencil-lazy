import { getElement } from "@stencil/core";
import { ComponentInstance } from "@stencil/core/dist/declarations";
import { BUILD } from "@stencil/core/build-conditionals";

declare type LazyDecorator = (
  target: ComponentInstance,
  propertyKey: string
) => void;

declare interface LazyOptions {
  margin?: string;
}


/**
 * Call this function as soon as the element is inside the viewport.
 * @param margin Optionally provide the padding (rootMargin) for IntersectionObserver. Determines how far from the viewport lazy loading starts. Can have values similar to the CSS margin property, e.g. "10px 20px 30px 40px" (top, right, bottom, left). The values can be percentages 
 * @example
```
@Lazy()
lazyCallback() {
  // this will run when element is inside the viewport.
}
```
 * @example
```
@Lazy({margin: "100px"})
lazyCallback() {
  // this will run when element is 100px from the viewport.
}
```
 */
export function Lazy(options?: LazyOptions): LazyDecorator {
  return (proto: ComponentInstance, methodName: string) => {
    // this is to resolve the 'compiler optimization issue':
    // lifecycle events not being called when not explicitly declared in at least one of components from bundle
    BUILD.cmpDidLoad = true;

    const { componentDidLoad } = proto;
    proto.componentDidLoad = function() {
      const host = getElement(this);
      const method = this[methodName];
      const margin = options ? options.margin : "";
      registerLazy(this, host, method, margin);
      return componentDidLoad && componentDidLoad.call(this);
    };
  };
}

/**
 * Register callback function for HTMLElement to be executed when the element is inside the viewport.
 *
 */
export function registerLazy(
  component: ComponentInstance,
  element: HTMLElement,
  callback: () => void,
  marginProp?: string
): void {
  if ("IntersectionObserver" in window) {
    const margin = getValidMargin(marginProp);
    if (!margin) {
      throw new Error(
        "@Lazy() decorator's optional parameter 'margin' is given but not valid. It should be a string like CSS margin property, e.g. '10px 20px 30px 40px'(top, right, bottom, left) or just '10px' (all). The values can be percentages "
      );
    }
    let io = new IntersectionObserver(
      (data: any) => {
        if (data[0].isIntersecting) {
          callback.call(component);
          io.disconnect();
          io = null;
        }
      },
      { rootMargin: margin }
    );
    io.observe(element);
  } else {
    // fall back to setTimeout for Safari and IE
    setTimeout(() => {
      callback.call(component);
    }, 300);
  }
}

/**
 * Checs if margin has values like CSS margin property, e.g. "10px 20px 30px 40px" (top, right, bottom, left). The values can be percentages.
 * For empty input string it returns default value '0px'. For not valid input it returns null.
 * @param margin Determines how far from the viewport lazy loading starts
 */
export function getValidMargin(margin?): string {
  const regexp = RegExp(/^(-?\d*\.?\d+)(px|%)$/);
  const marginString = margin || "0px";
  return marginString.split(/\s+/).every(margin => regexp.test(margin))
    ? marginString
    : null;
}