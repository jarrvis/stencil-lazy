import { getElement } from "@stencil/core";
import {
  ComponentInstance,
  HTMLStencilElement
} from "@stencil/core/dist/declarations";

declare type LazyDecorator = (
  target: ComponentInstance,
  propertyKey: string
) => void;

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
    const { render } = proto;
    proto.render = function() {
      const host = getElement(this);
      const method = this[methodName];
      const margin = options ? options.margin : "";
      registerLazy(this, host, method, margin);
      return render && render.call(this);
    };
  };
}

/**
 * Register callback function for HTMLElement to be executed when the element is inside the viewport.
 *
 */
export function registerLazy(
  component: ComponentInstance,
  element: HTMLLazyElement,
  callback: () => void,
  marginProp?: string
): void {
  if (!element.lazyRegistered) {
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
    element.lazyRegistered = true;
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

export interface LazyOptions {
  margin?: string;
}

export interface HTMLLazyElement extends HTMLStencilElement {
  lazyRegistered?: boolean;
}
