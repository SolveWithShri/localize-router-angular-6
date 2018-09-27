import { Inject, InjectionToken, Pipe, ChangeDetectorRef, SystemJsNgModuleLoader, SystemJsNgModuleLoaderConfig, Optional, Compiler, Injectable, forwardRef, NgModule, APP_INITIALIZER, SkipSelf, Injector, NgModuleFactoryLoader } from '@angular/core';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { Observable, Subject } from 'rxjs';
import { Location, CommonModule } from '@angular/common';
import { Router, NavigationStart, ActivatedRoute, ROUTES, RouterModule } from '@angular/router';
import { filter, pairwise } from 'rxjs/operators';

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,uselessCode} checked by tsc
 */
/**
 * Guard to make sure we have single initialization of forRoot
 * @type {?}
 */
const LOCALIZE_ROUTER_FORROOT_GUARD = new InjectionToken('LOCALIZE_ROUTER_FORROOT_GUARD');
/**
 * Static provider for keeping track of routes
 * @type {?}
 */
const RAW_ROUTES = new InjectionToken('RAW_ROUTES');
/**
 * Namespace for fail proof access of CacheMechanism
 */
/**
 * Namespace for fail proof access of CacheMechanism
 */
var CacheMechanism;
/**
 * Namespace for fail proof access of CacheMechanism
 */
(function (CacheMechanism) {
    CacheMechanism.LocalStorage = 'LocalStorage';
    CacheMechanism.Cookie = 'Cookie';
})(CacheMechanism || (CacheMechanism = {}));
/**
 * Boolean to indicate whether to use cached language value
 * @type {?}
 */
const USE_CACHED_LANG = new InjectionToken('USE_CACHED_LANG');
/**
 * Cache mechanism type
 * @type {?}
 */
const CACHE_MECHANISM = new InjectionToken('CACHE_MECHANISM');
/**
 * Cache name
 * @type {?}
 */
const CACHE_NAME = new InjectionToken('CACHE_NAME');
/**
 * Function for calculating default language
 * @type {?}
 */
const DEFAULT_LANG_FUNCTION = new InjectionToken('DEFAULT_LANG_FUNCTION');
/**
 * Boolean to indicate whether prefix should be set for single language scenarios
 * @type {?}
 */
const ALWAYS_SET_PREFIX = new InjectionToken('ALWAYS_SET_PREFIX');
/** @type {?} */
const LOCALIZE_CACHE_NAME = 'LOCALIZE_DEFAULT_LANGUAGE';
class LocalizeRouterSettings {
    /**
     * Settings for localize router
     * @param {?=} useCachedLang
     * @param {?=} alwaysSetPrefix
     * @param {?=} cacheMechanism
     * @param {?=} cacheName
     * @param {?=} defaultLangFunction
     */
    constructor(useCachedLang = true, alwaysSetPrefix = true, cacheMechanism = CacheMechanism.LocalStorage, cacheName = LOCALIZE_CACHE_NAME, defaultLangFunction = void 0) {
        this.useCachedLang = useCachedLang;
        this.alwaysSetPrefix = alwaysSetPrefix;
        this.cacheMechanism = cacheMechanism;
        this.cacheName = cacheName;
        this.defaultLangFunction = defaultLangFunction;
    }
}
LocalizeRouterSettings.ctorParameters = () => [
    { type: Boolean, decorators: [{ type: Inject, args: [USE_CACHED_LANG,] }] },
    { type: Boolean, decorators: [{ type: Inject, args: [ALWAYS_SET_PREFIX,] }] },
    { type: CacheMechanism, decorators: [{ type: Inject, args: [CACHE_MECHANISM,] }] },
    { type: String, decorators: [{ type: Inject, args: [CACHE_NAME,] }] },
    { type: undefined, decorators: [{ type: Inject, args: [DEFAULT_LANG_FUNCTION,] }] }
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,uselessCode} checked by tsc
 */
/** @type {?} */
const COOKIE_EXPIRY = 30;
// 1 month
/**
 * Abstract class for parsing localization
 * @abstract
 */
class LocalizeParser {
    /**
     * Loader constructor
     * @param {?} translate
     * @param {?} location
     * @param {?} settings
     */
    constructor(translate, location, settings) {
        this.translate = translate;
        this.location = location;
        this.settings = settings;
    }
    /**
     * Prepare routes to be fully usable by ngx-translate-router
     * @param routes
     */
    /* private initRoutes(routes: Routes, prefix = '') {
        routes.forEach(route => {
          if (route.path !== '**') {
            const routeData: any = route.data = route.data || {};
            routeData.localizeRouter = {};
            routeData.localizeRouter.fullPath = `${prefix}/${route.path}`;
            if (route.children && route.children.length > 0) {
              this.initRoutes(route.children, routeData.localizeRouter.fullPath);
            }
          }
        });
      } */
    /**
     * Initialize language and routes
     * @param {?} routes
     * @return {?}
     */
    init(routes) {
        /** @type {?} */
        let selectedLanguage;
        // this.initRoutes(routes);
        this.routes = routes;
        if (!this.locales || !this.locales.length) {
            return Promise.resolve();
        }
        /**
         * detect current language
         * @type {?}
         */
        const locationLang = this.getLocationLang();
        /** @type {?} */
        const browserLang = this._getBrowserLang();
        if (this.settings.defaultLangFunction) {
            this.defaultLang = this.settings.defaultLangFunction(this.locales, this._cachedLang, browserLang);
        }
        else {
            this.defaultLang = this._cachedLang || browserLang || this.locales[0];
        }
        selectedLanguage = locationLang || this.defaultLang;
        this.translate.setDefaultLang(this.defaultLang);
        /** @type {?} */
        let children = [];
        /** if set prefix is enforced */
        if (this.settings.alwaysSetPrefix) {
            /** @type {?} */
            const baseRoute = { path: '', redirectTo: this.defaultLang, pathMatch: 'full' };
            /**
             * extract potential wildcard route
             * @type {?}
             */
            const wildcardIndex = routes.findIndex((route) => route.path === '**');
            if (wildcardIndex !== -1) {
                this._wildcardRoute = routes.splice(wildcardIndex, 1)[0];
            }
            children = this.routes.splice(0, this.routes.length, baseRoute);
        }
        else {
            children = [...this.routes]; // shallow copy of routes
        }
        /** exclude certain routes */
        for (let i = children.length - 1; i >= 0; i--) {
            if (children[i].data && children[i].data['skipRouteLocalization']) {
                if (this.settings.alwaysSetPrefix) {
                    // add directly to routes
                    this.routes.push(children[i]);
                }
                children.splice(i, 1);
            }
        }
        /** append children routes */
        if (children && children.length) {
            if (this.locales.length > 1 || this.settings.alwaysSetPrefix) {
                this._languageRoute = { children: children };
                this.routes.unshift(this._languageRoute);
            }
        }
        /** ...and potential wildcard route */
        if (this._wildcardRoute && this.settings.alwaysSetPrefix) {
            this.routes.push(this._wildcardRoute);
        }
        /**
         * translate routes
         * @type {?}
         */
        const res = this.translateRoutes(selectedLanguage);
        return res.toPromise();
    }
    /**
     * @param {?} routes
     * @return {?}
     */
    initChildRoutes(routes) {
        this._translateRouteTree(routes);
        return routes;
    }
    /**
     * Translate routes to selected language
     * @param {?} language
     * @return {?}
     */
    translateRoutes(language) {
        return new Observable((observer) => {
            this._cachedLang = language;
            if (this._languageRoute) {
                this._languageRoute.path = language;
            }
            this.translate.use(language).subscribe((translations) => {
                this._translationObject = translations;
                this.currentLang = language;
                if (this._languageRoute) {
                    if (this._languageRoute) {
                        this._translateRouteTree(this._languageRoute.children);
                    }
                    // if there is wildcard route
                    if (this._wildcardRoute && this._wildcardRoute.redirectTo) {
                        this._translateProperty(this._wildcardRoute, 'redirectTo', true);
                    }
                }
                else {
                    this._translateRouteTree(this.routes);
                }
                observer.next(void 0);
                observer.complete();
            });
        });
    }
    /**
     * Translate the route node and recursively call for all it's children
     * @param {?} routes
     * @return {?}
     */
    _translateRouteTree(routes) {
        routes.forEach((route) => {
            if (route.path && route.path !== '**') {
                this._translateProperty(route, 'path');
            }
            if (route.redirectTo) {
                this._translateProperty(route, 'redirectTo', !route.redirectTo.indexOf('/'));
            }
            if (route.children) {
                this._translateRouteTree(route.children);
            }
            if (route.loadChildren && ((/** @type {?} */ (route)))._loadedConfig) {
                this._translateRouteTree(((/** @type {?} */ (route)))._loadedConfig.routes);
            }
        });
    }
    /**
     * Translate property
     * If first time translation then add original to route data object
     * @param {?} route
     * @param {?} property
     * @param {?=} prefixLang
     * @return {?}
     */
    _translateProperty(route, property, prefixLang) {
        // set property to data if not there yet
        /** @type {?} */
        const routeData = route.data = route.data || {};
        if (!routeData.localizeRouter) {
            routeData.localizeRouter = {};
        }
        if (!routeData.localizeRouter[property]) {
            routeData.localizeRouter[property] = ((/** @type {?} */ (route)))[property];
        }
        /** @type {?} */
        const result = this.translateRoute(routeData.localizeRouter[property]);
        ((/** @type {?} */ (route)))[property] = prefixLang ? `/${this.urlPrefix}${result}` : result;
    }
    /**
     * @return {?}
     */
    get urlPrefix() {
        return this.settings.alwaysSetPrefix || this.currentLang !== this.defaultLang ? this.currentLang : '';
    }
    /**
     * Translate route and return observable
     * @param {?} path
     * @return {?}
     */
    translateRoute(path) {
        /** @type {?} */
        const queryParts = path.split('?');
        if (queryParts.length > 2) {
            throw Error('There should be only one query parameter block in the URL');
        }
        /** @type {?} */
        const pathSegments = queryParts[0].split('/');
        /** collect observables  */
        return pathSegments
            .map((part) => part.length ? this.translateText(part) : part)
            .join('/') +
            (queryParts.length > 1 ? `?${queryParts[1]}` : '');
    }
    /**
     * Get language from url
     * @param {?=} url
     * @return {?}
     */
    getLocationLang(url) {
        /** @type {?} */
        const queryParamSplit = (url || this.location.path()).split('?');
        /** @type {?} */
        let pathSlices = [];
        if (queryParamSplit.length > 0) {
            pathSlices = queryParamSplit[0].split('/');
        }
        if (pathSlices.length > 1 && this.locales.indexOf(pathSlices[1]) !== -1) {
            return pathSlices[1];
        }
        if (pathSlices.length && this.locales.indexOf(pathSlices[0]) !== -1) {
            return pathSlices[0];
        }
        return null;
    }
    /**
     * Get user's language set in the browser
     * @return {?}
     */
    _getBrowserLang() {
        return this._returnIfInLocales(this.translate.getBrowserLang());
    }
    /**
     * Get language from local storage or cookie
     * @return {?}
     */
    get _cachedLang() {
        if (!this.settings.useCachedLang) {
            return;
        }
        if (this.settings.cacheMechanism === CacheMechanism.LocalStorage) {
            return this._cacheWithLocalStorage();
        }
        if (this.settings.cacheMechanism === CacheMechanism.Cookie) {
            return this._cacheWithCookies();
        }
    }
    /**
     * Save language to local storage or cookie
     * @param {?} value
     * @return {?}
     */
    set _cachedLang(value) {
        if (!this.settings.useCachedLang) {
            return;
        }
        if (this.settings.cacheMechanism === CacheMechanism.LocalStorage) {
            this._cacheWithLocalStorage(value);
        }
        if (this.settings.cacheMechanism === CacheMechanism.Cookie) {
            this._cacheWithCookies(value);
        }
    }
    /**
     * Cache value to local storage
     * @param {?=} value
     * @return {?}
     */
    _cacheWithLocalStorage(value) {
        if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
            return;
        }
        try {
            if (value) {
                window.localStorage.setItem(this.settings.cacheName, value);
                return;
            }
            return this._returnIfInLocales(window.localStorage.getItem(this.settings.cacheName));
        }
        catch (e) {
            // weird Safari issue in private mode, where LocalStorage is defined but throws error on access
            return;
        }
    }
    /**
     * Cache value via cookies
     * @param {?=} value
     * @return {?}
     */
    _cacheWithCookies(value) {
        if (typeof document === 'undefined' || typeof document.cookie === 'undefined') {
            return;
        }
        try {
            /** @type {?} */
            const name = encodeURIComponent(this.settings.cacheName);
            if (value) {
                /** @type {?} */
                const d = new Date();
                d.setTime(d.getTime() + COOKIE_EXPIRY * 86400000); // * days
                document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()}`;
                return;
            }
            /** @type {?} */
            const regexp = new RegExp('(?:^' + name + '|;\\s*' + name + ')=(.*?)(?:;|$)', 'g');
            /** @type {?} */
            const result = regexp.exec(document.cookie);
            return decodeURIComponent(result[1]);
        }
        catch (e) {
            return; // should not happen but better safe than sorry
        }
    }
    /**
     * Check if value exists in locales list
     * @param {?} value
     * @return {?}
     */
    _returnIfInLocales(value) {
        if (value && this.locales.indexOf(value) !== -1) {
            return value;
        }
        return null;
    }
    /**
     * Get translated value
     * @param {?} key
     * @return {?}
     */
    translateText(key) {
        if (!this._translationObject) {
            return key;
        }
        /** @type {?} */
        const fullKey = this.prefix + key;
        /** @type {?} */
        const res = this.translate.getParsedResult(this._translationObject, fullKey);
        return res !== fullKey ? res : key;
    }
}
LocalizeParser.ctorParameters = () => [
    { type: TranslateService, decorators: [{ type: Inject, args: [TranslateService,] }] },
    { type: Location, decorators: [{ type: Inject, args: [Location,] }] },
    { type: LocalizeRouterSettings, decorators: [{ type: Inject, args: [LocalizeRouterSettings,] }] }
];
/**
 * Manually set configuration
 */
class ManualParserLoader extends LocalizeParser {
    /**
     * CTOR
     * @param {?} translate
     * @param {?} location
     * @param {?} settings
     * @param {?=} locales
     * @param {?=} prefix
     */
    constructor(translate, location, settings, locales = ['en'], prefix = 'ROUTES.') {
        super(translate, location, settings);
        this.locales = locales;
        this.prefix = prefix || '';
    }
    /**
     * Initialize or append routes
     * @param {?} routes
     * @return {?}
     */
    load(routes) {
        return new Promise((resolve) => {
            this.init(routes).then(resolve);
        });
    }
}
class DummyLocalizeParser extends LocalizeParser {
    /**
     * @param {?} routes
     * @return {?}
     */
    load(routes) {
        return new Promise((resolve) => {
            this.init(routes).then(resolve);
        });
    }
}

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,uselessCode} checked by tsc
 */
/**
 * Localization service
 * modifyRoutes
 */
class LocalizeRouterService {
    /**
     * CTOR
     * @param {?} parser
     * @param {?} settings
     * @param {?} router
     * @param {?} route
     */
    constructor(parser, settings, router, route) {
        this.parser = parser;
        this.settings = settings;
        this.router = router;
        this.route = route;
        this.routerEvents = new Subject();
    }
    /**
     * Start up the service
     * @return {?}
     */
    init() {
        this.router.resetConfig(this.parser.routes);
        // subscribe to router events
        this.router.events
            .pipe(filter(event => event instanceof NavigationStart), pairwise())
            .subscribe(this._routeChanged());
    }
    /**
     * Change language and navigate to translated route
     * @param {?} lang
     * @param {?=} extras
     * @param {?=} useNavigateMethod
     * @return {?}
     */
    changeLanguage(lang, extras, useNavigateMethod) {
        if (this.route) {
            console.log(this.route);
        }
        if (lang !== this.parser.currentLang) {
            /** @type {?} */
            const rootSnapshot = this.router.routerState.snapshot.root;
            this.parser.translateRoutes(lang).subscribe(() => {
                /** @type {?} */
                const queryParams = rootSnapshot.queryParams;
                /** @type {?} */
                let url = '';
                if (Object.keys(queryParams).length !== 0) {
                    /** @type {?} */
                    const queryString = Object.keys(queryParams).map(function (key) {
                        return key + '=' + queryParams[key];
                    }).join('&');
                    url = this.traverseRouteSnapshot(rootSnapshot) + '?' + queryString;
                }
                else {
                    url = this.traverseRouteSnapshot(rootSnapshot);
                }
                if (!this.settings.alwaysSetPrefix) {
                    /** @type {?} */
                    let urlSegments = url.split('/');
                    /** @type {?} */
                    const languageSegmentIndex = urlSegments.indexOf(this.parser.currentLang);
                    // If the default language has no prefix make sure to remove and add it when necessary
                    if (this.parser.currentLang === this.parser.defaultLang) {
                        // Remove the language prefix from url when current language is the default language
                        if (languageSegmentIndex === 0 || (languageSegmentIndex === 1 && urlSegments[0] === '')) {
                            // Remove the current aka default language prefix from the url
                            urlSegments = urlSegments.slice(0, languageSegmentIndex).concat(urlSegments.slice(languageSegmentIndex + 1));
                        }
                    }
                    else {
                        // When coming from a default language it's possible that the url doesn't contain the language, make sure it does.
                        if (languageSegmentIndex === -1) {
                            // If the url starts with a slash make sure to keep it.
                            /** @type {?} */
                            const injectionIndex = urlSegments[0] === '' ? 1 : 0;
                            urlSegments = urlSegments.slice(0, injectionIndex).concat(this.parser.currentLang, urlSegments.slice(injectionIndex));
                        }
                    }
                    url = urlSegments.join('/');
                }
                this.router.resetConfig(this.parser.routes);
                if (useNavigateMethod) {
                    this.router.navigate([url], extras);
                }
                else {
                    this.router.navigateByUrl(url, extras);
                }
            });
        }
    }
    /**
     * Traverses through the tree to assemble new translated url
     * @param {?} snapshot
     * @return {?}
     */
    traverseRouteSnapshot(snapshot) {
        if (snapshot.firstChild && snapshot.routeConfig) {
            return `${this.parseSegmentValue(snapshot)}/${this.traverseRouteSnapshot(snapshot.firstChild)}`;
        }
        else if (snapshot.firstChild) {
            return this.traverseRouteSnapshot(snapshot.firstChild);
        }
        else {
            return this.parseSegmentValue(snapshot);
        }
        /* if (snapshot.firstChild && snapshot.firstChild.routeConfig && snapshot.firstChild.routeConfig.path) {
          if (snapshot.firstChild.routeConfig.path !== '**') {
            return this.parseSegmentValue(snapshot) + '/' + this.traverseRouteSnapshot(snapshot.firstChild);
          } else {
            return this.parseSegmentValue(snapshot.firstChild);
          }
        }
        return this.parseSegmentValue(snapshot); */
    }
    /**
     * Extracts new segment value based on routeConfig and url
     * @param {?} snapshot
     * @return {?}
     */
    parseSegmentValue(snapshot) {
        if (snapshot.data.localizeRouter) {
            /** @type {?} */
            const path = snapshot.data.localizeRouter.path;
            /** @type {?} */
            const subPathSegments = path.split('/');
            return subPathSegments.map((s, i) => s.indexOf(':') === 0 ? snapshot.url[i].path : s).join('/');
        }
        else {
            return '';
        }
        /* if (snapshot.routeConfig) {
          if (snapshot.routeConfig.path === '**') {
            return snapshot.url.filter((segment: UrlSegment) => segment.path).map((segment: UrlSegment) => segment.path).join('/');
          } else {
            const subPathSegments = snapshot.routeConfig.path.split('/');
            return subPathSegments.map((s: string, i: number) => s.indexOf(':') === 0 ? snapshot.url[i].path : s).join('/');
          }
        }
        return ''; */
    }
    /**
     * Translate route to current language
     * If new language is explicitly provided then replace language part in url with new language
     * @param {?} path
     * @return {?}
     */
    translateRoute(path) {
        if (typeof path === 'string') {
            /** @type {?} */
            const url = this.parser.translateRoute(path);
            return !path.indexOf('/') ? `/${this.parser.urlPrefix}${url}` : url;
        }
        // it's an array
        /** @type {?} */
        const result = [];
        ((/** @type {?} */ (path))).forEach((segment, index) => {
            if (typeof segment === 'string') {
                /** @type {?} */
                const res = this.parser.translateRoute(segment);
                if (!index && !segment.indexOf('/')) {
                    result.push(`/${this.parser.urlPrefix}${res}`);
                }
                else {
                    result.push(res);
                }
            }
            else {
                result.push(segment);
            }
        });
        return result;
    }
    /**
     * Event handler to react on route change
     * @return {?}
     */
    _routeChanged() {
        return ([previousEvent, currentEvent]) => {
            /** @type {?} */
            const previousLang = this.parser.getLocationLang(previousEvent.url) || this.parser.defaultLang;
            /** @type {?} */
            const currentLang = this.parser.getLocationLang(currentEvent.url) || this.parser.defaultLang;
            if (currentLang !== previousLang) {
                this.parser.translateRoutes(currentLang).subscribe(() => {
                    this.router.resetConfig(this.parser.routes);
                    // Fire route change event
                    this.routerEvents.next(currentLang);
                });
            }
        };
    }
}
LocalizeRouterService.ctorParameters = () => [
    { type: LocalizeParser, decorators: [{ type: Inject, args: [LocalizeParser,] }] },
    { type: LocalizeRouterSettings, decorators: [{ type: Inject, args: [LocalizeRouterSettings,] }] },
    { type: Router, decorators: [{ type: Inject, args: [Router,] }] },
    { type: ActivatedRoute, decorators: [{ type: Inject, args: [ActivatedRoute,] }] }
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,uselessCode} checked by tsc
 */
/**
 * Compare if two objects are same
 * @param {?} o1
 * @param {?} o2
 * @return {?}
 */
function equals(o1, o2) {
    if (o1 === o2) {
        return true;
    }
    if (o1 === null || o2 === null) {
        return false;
    }
    if (o1 !== o1 && o2 !== o2) {
        return true; // NaN === NaN
    }
    /** @type {?} */
    const t1 = typeof o1;
    /** @type {?} */
    const t2 = typeof o2;
    /** @type {?} */
    let length;
    /** @type {?} */
    let key;
    /** @type {?} */
    let keySet;
    if (t1 === t2 && t1 === 'object') {
        if (Array.isArray(o1)) {
            if (!Array.isArray(o2)) {
                return false;
            }
            if ((length = o1.length) === o2.length) {
                for (key = 0; key < length; key++) {
                    if (!equals(o1[key], o2[key])) {
                        return false;
                    }
                }
                return true;
            }
        }
        else {
            if (Array.isArray(o2)) {
                return false;
            }
            keySet = Object.create(null);
            for (key in o1) {
                if (o1.hasOwnProperty(key)) {
                    if (!equals(o1[key], o2[key])) {
                        return false;
                    }
                    keySet[key] = true;
                }
            }
            for (key in o2) {
                if (o2.hasOwnProperty(key)) {
                    if (!(key in keySet) && typeof o2[key] !== 'undefined') {
                        return false;
                    }
                }
            }
            return true;
        }
    }
    return false;
}

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,uselessCode} checked by tsc
 */
/** @type {?} */
const VIEW_DESTROYED_STATE = 128;
class LocalizeRouterPipe {
    /**
     * CTOR
     * @param {?} localize
     * @param {?} _ref
     */
    constructor(localize, _ref) {
        this.localize = localize;
        this._ref = _ref;
        this.value = '';
        this.subscription = this.localize.routerEvents.subscribe(() => {
            this.transform(this.lastKey);
        });
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
    /**
     * Transform current url to localized one
     * @param {?} query
     * @return {?}
     */
    transform(query) {
        if (!query || query.length === 0 || !this.localize.parser.currentLang) {
            return query;
        }
        if (equals(query, this.lastKey) && equals(this.lastLanguage, this.localize.parser.currentLang)) {
            return this.value;
        }
        this.lastKey = query;
        this.lastLanguage = this.localize.parser.currentLang;
        /** translate key and update values */
        this.value = this.localize.translateRoute(query);
        this.lastKey = query;
        // if view is already destroyed, ignore firing change detection
        if (((/** @type {?} */ (this._ref)))._view.state & VIEW_DESTROYED_STATE) {
            return this.value;
        }
        this._ref.detectChanges();
        return this.value;
    }
}
LocalizeRouterPipe.decorators = [
    { type: Pipe, args: [{
                name: 'localize',
                pure: false // required to update the value when the promise is resolved
            },] },
];
LocalizeRouterPipe.ctorParameters = () => [
    { type: LocalizeRouterService },
    { type: ChangeDetectorRef }
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,uselessCode} checked by tsc
 */
/**
 * Extension of SystemJsNgModuleLoader to enable localization of route on lazy load
 */
class LocalizeRouterConfigLoader extends SystemJsNgModuleLoader {
    /**
     * @param {?} localize
     * @param {?} _compiler
     * @param {?=} config
     */
    constructor(localize, _compiler, config) {
        super(_compiler, config);
        this.localize = localize;
    }
    /**
     * Extend load with custom functionality
     * @param {?} path
     * @return {?}
     */
    load(path) {
        return super.load(path).then((factory) => {
            return {
                moduleType: factory.moduleType,
                create: (parentInjector) => {
                    /** @type {?} */
                    const module = factory.create(parentInjector);
                    /** @type {?} */
                    const getMethod = module.injector.get.bind(module.injector);
                    module.injector['get'] = (token, notFoundValue) => {
                        /** @type {?} */
                        const getResult = getMethod(token, notFoundValue);
                        if (token === ROUTES) {
                            // translate lazy routes
                            return this.localize.initChildRoutes([].concat(...getResult));
                        }
                        else {
                            return getResult;
                        }
                    };
                    return module;
                }
            };
        });
    }
}
LocalizeRouterConfigLoader.decorators = [
    { type: Injectable },
];
LocalizeRouterConfigLoader.ctorParameters = () => [
    { type: LocalizeParser, decorators: [{ type: Inject, args: [forwardRef(() => LocalizeParser),] }] },
    { type: Compiler },
    { type: SystemJsNgModuleLoaderConfig, decorators: [{ type: Optional }] }
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,uselessCode} checked by tsc
 */
class ParserInitializer {
    /**
     * CTOR
     * @param {?} injector
     */
    constructor(injector) {
        this.injector = injector;
    }
    /**
     * @return {?}
     */
    appInitializer() {
        /** @type {?} */
        const res = this.parser.load(this.routes);
        res.then(() => {
            /** @type {?} */
            const localize = this.injector.get(LocalizeRouterService);
            localize.init();
        });
        return res;
    }
    /**
     * @param {?} parser
     * @param {?} routes
     * @return {?}
     */
    generateInitializer(parser, routes) {
        this.parser = parser;
        this.routes = routes.reduce((a, b) => a.concat(b));
        return this.appInitializer;
    }
}
ParserInitializer.decorators = [
    { type: Injectable },
];
ParserInitializer.ctorParameters = () => [
    { type: Injector }
];
/**
 * @param {?} p
 * @param {?} parser
 * @param {?} routes
 * @return {?}
 */
function getAppInitializer(p, parser, routes) {
    return p.generateInitializer(parser, routes).bind(p);
}
class LocalizeRouterModule {
    /**
     * @param {?} routes
     * @param {?=} config
     * @return {?}
     */
    static forRoot(routes, config = {}) {
        return {
            ngModule: LocalizeRouterModule,
            providers: [
                {
                    provide: LOCALIZE_ROUTER_FORROOT_GUARD,
                    useFactory: provideForRootGuard,
                    deps: [[LocalizeRouterModule, new Optional(), new SkipSelf()]]
                },
                { provide: USE_CACHED_LANG, useValue: config.useCachedLang },
                { provide: ALWAYS_SET_PREFIX, useValue: config.alwaysSetPrefix },
                { provide: CACHE_NAME, useValue: config.cacheName },
                { provide: CACHE_MECHANISM, useValue: config.cacheMechanism },
                { provide: DEFAULT_LANG_FUNCTION, useValue: config.defaultLangFunction },
                LocalizeRouterSettings,
                config.parser || { provide: LocalizeParser, useClass: DummyLocalizeParser },
                {
                    provide: RAW_ROUTES,
                    multi: true,
                    useValue: routes
                },
                LocalizeRouterService,
                ParserInitializer,
                { provide: NgModuleFactoryLoader, useClass: LocalizeRouterConfigLoader },
                {
                    provide: APP_INITIALIZER,
                    multi: true,
                    useFactory: getAppInitializer,
                    deps: [ParserInitializer, LocalizeParser, RAW_ROUTES]
                }
            ]
        };
    }
    /**
     * @param {?} routes
     * @return {?}
     */
    static forChild(routes) {
        return {
            ngModule: LocalizeRouterModule,
            providers: [
                {
                    provide: RAW_ROUTES,
                    multi: true,
                    useValue: routes
                }
            ]
        };
    }
}
LocalizeRouterModule.decorators = [
    { type: NgModule, args: [{
                imports: [CommonModule, RouterModule, TranslateModule],
                declarations: [LocalizeRouterPipe],
                exports: [LocalizeRouterPipe]
            },] },
];
/**
 * @param {?} localizeRouterModule
 * @return {?}
 */
function provideForRootGuard(localizeRouterModule) {
    if (localizeRouterModule) {
        throw new Error(`LocalizeRouterModule.forRoot() called twice. Lazy loaded modules should use LocalizeRouterModule.forChild() instead.`);
    }
    return 'guarded';
}

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,uselessCode} checked by tsc
 */

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,uselessCode} checked by tsc
 */

export { ParserInitializer, getAppInitializer, LocalizeRouterModule, provideForRootGuard, LocalizeParser, ManualParserLoader, DummyLocalizeParser, LocalizeRouterService, LocalizeRouterPipe, LOCALIZE_ROUTER_FORROOT_GUARD, RAW_ROUTES, CacheMechanism, USE_CACHED_LANG, CACHE_MECHANISM, CACHE_NAME, DEFAULT_LANG_FUNCTION, ALWAYS_SET_PREFIX, LocalizeRouterSettings, LocalizeRouterConfigLoader };

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2lsc2Rhdi1uZ3gtdHJhbnNsYXRlLXJvdXRlci5qcy5tYXAiLCJzb3VyY2VzIjpbIm5nOi8vQGdpbHNkYXYvbmd4LXRyYW5zbGF0ZS1yb3V0ZXIvbGliL2xvY2FsaXplLXJvdXRlci5jb25maWcudHMiLCJuZzovL0BnaWxzZGF2L25neC10cmFuc2xhdGUtcm91dGVyL2xpYi9sb2NhbGl6ZS1yb3V0ZXIucGFyc2VyLnRzIiwibmc6Ly9AZ2lsc2Rhdi9uZ3gtdHJhbnNsYXRlLXJvdXRlci9saWIvbG9jYWxpemUtcm91dGVyLnNlcnZpY2UudHMiLCJuZzovL0BnaWxzZGF2L25neC10cmFuc2xhdGUtcm91dGVyL2xpYi91dGlsLnRzIiwibmc6Ly9AZ2lsc2Rhdi9uZ3gtdHJhbnNsYXRlLXJvdXRlci9saWIvbG9jYWxpemUtcm91dGVyLnBpcGUudHMiLCJuZzovL0BnaWxzZGF2L25neC10cmFuc2xhdGUtcm91dGVyL2xpYi9sb2NhbGl6ZS1yb3V0ZXItY29uZmlnLWxvYWRlci50cyIsIm5nOi8vQGdpbHNkYXYvbmd4LXRyYW5zbGF0ZS1yb3V0ZXIvbGliL2xvY2FsaXplLXJvdXRlci5tb2R1bGUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSW5qZWN0LCBJbmplY3Rpb25Ub2tlbiwgUHJvdmlkZXIgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IFJvdXRlcyB9IGZyb20gJ0Bhbmd1bGFyL3JvdXRlcic7XG5pbXBvcnQgeyBMb2NhbGl6ZVJvdXRlck1vZHVsZSB9IGZyb20gJy4vbG9jYWxpemUtcm91dGVyLm1vZHVsZSc7XG5cbi8qKlxuICogR3VhcmQgdG8gbWFrZSBzdXJlIHdlIGhhdmUgc2luZ2xlIGluaXRpYWxpemF0aW9uIG9mIGZvclJvb3RcbiAqL1xuZXhwb3J0IGNvbnN0IExPQ0FMSVpFX1JPVVRFUl9GT1JST09UX0dVQVJEID0gbmV3IEluamVjdGlvblRva2VuPExvY2FsaXplUm91dGVyTW9kdWxlPignTE9DQUxJWkVfUk9VVEVSX0ZPUlJPT1RfR1VBUkQnKTtcblxuLyoqXG4gKiBTdGF0aWMgcHJvdmlkZXIgZm9yIGtlZXBpbmcgdHJhY2sgb2Ygcm91dGVzXG4gKi9cbmV4cG9ydCBjb25zdCBSQVdfUk9VVEVTOiBJbmplY3Rpb25Ub2tlbjxSb3V0ZXNbXT4gPSBuZXcgSW5qZWN0aW9uVG9rZW48Um91dGVzW10+KCdSQVdfUk9VVEVTJyk7XG5cbi8qKlxuICogVHlwZSBmb3IgQ2FjaGluZyBvZiBkZWZhdWx0IGxhbmd1YWdlXG4gKi9cbmV4cG9ydCB0eXBlIENhY2hlTWVjaGFuaXNtID0gJ0xvY2FsU3RvcmFnZScgfCAnQ29va2llJztcblxuLyoqXG4gKiBOYW1lc3BhY2UgZm9yIGZhaWwgcHJvb2YgYWNjZXNzIG9mIENhY2hlTWVjaGFuaXNtXG4gKi9cbmV4cG9ydCBuYW1lc3BhY2UgQ2FjaGVNZWNoYW5pc20ge1xuICBleHBvcnQgY29uc3QgTG9jYWxTdG9yYWdlOiBDYWNoZU1lY2hhbmlzbSA9ICdMb2NhbFN0b3JhZ2UnO1xuICBleHBvcnQgY29uc3QgQ29va2llOiBDYWNoZU1lY2hhbmlzbSA9ICdDb29raWUnO1xufVxuXG4vKipcbiAqIEJvb2xlYW4gdG8gaW5kaWNhdGUgd2hldGhlciB0byB1c2UgY2FjaGVkIGxhbmd1YWdlIHZhbHVlXG4gKi9cbmV4cG9ydCBjb25zdCBVU0VfQ0FDSEVEX0xBTkcgPSBuZXcgSW5qZWN0aW9uVG9rZW48Ym9vbGVhbj4oJ1VTRV9DQUNIRURfTEFORycpO1xuLyoqXG4gKiBDYWNoZSBtZWNoYW5pc20gdHlwZVxuICovXG5leHBvcnQgY29uc3QgQ0FDSEVfTUVDSEFOSVNNID0gbmV3IEluamVjdGlvblRva2VuPENhY2hlTWVjaGFuaXNtPignQ0FDSEVfTUVDSEFOSVNNJyk7XG4vKipcbiAqIENhY2hlIG5hbWVcbiAqL1xuZXhwb3J0IGNvbnN0IENBQ0hFX05BTUUgPSBuZXcgSW5qZWN0aW9uVG9rZW48c3RyaW5nPignQ0FDSEVfTkFNRScpO1xuXG4vKipcbiAqIFR5cGUgZm9yIGRlZmF1bHQgbGFuZ3VhZ2UgZnVuY3Rpb25cbiAqIFVzZWQgdG8gb3ZlcnJpZGUgYmFzaWMgYmVoYXZpb3VyXG4gKi9cbmV4cG9ydCB0eXBlIERlZmF1bHRMYW5ndWFnZUZ1bmN0aW9uID0gKGxhbmd1YWdlczogc3RyaW5nW10sIGNhY2hlZExhbmc/OiBzdHJpbmcsIGJyb3dzZXJMYW5nPzogc3RyaW5nKSA9PiBzdHJpbmc7XG5cbi8qKlxuICogRnVuY3Rpb24gZm9yIGNhbGN1bGF0aW5nIGRlZmF1bHQgbGFuZ3VhZ2VcbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfTEFOR19GVU5DVElPTiA9IG5ldyBJbmplY3Rpb25Ub2tlbjxEZWZhdWx0TGFuZ3VhZ2VGdW5jdGlvbj4oJ0RFRkFVTFRfTEFOR19GVU5DVElPTicpO1xuXG4vKipcbiAqIEJvb2xlYW4gdG8gaW5kaWNhdGUgd2hldGhlciBwcmVmaXggc2hvdWxkIGJlIHNldCBmb3Igc2luZ2xlIGxhbmd1YWdlIHNjZW5hcmlvc1xuICovXG5leHBvcnQgY29uc3QgQUxXQVlTX1NFVF9QUkVGSVggPSBuZXcgSW5qZWN0aW9uVG9rZW48Ym9vbGVhbj4oJ0FMV0FZU19TRVRfUFJFRklYJyk7XG5cbi8qKlxuICogQ29uZmlnIGludGVyZmFjZSBmb3IgTG9jYWxpemVSb3V0ZXJcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2NhbGl6ZVJvdXRlckNvbmZpZyB7XG4gIHBhcnNlcj86IFByb3ZpZGVyO1xuICB1c2VDYWNoZWRMYW5nPzogYm9vbGVhbjtcbiAgY2FjaGVNZWNoYW5pc20/OiBDYWNoZU1lY2hhbmlzbTtcbiAgY2FjaGVOYW1lPzogc3RyaW5nO1xuICBkZWZhdWx0TGFuZ0Z1bmN0aW9uPzogRGVmYXVsdExhbmd1YWdlRnVuY3Rpb247XG4gIGFsd2F5c1NldFByZWZpeD86IGJvb2xlYW47XG59XG5cbmNvbnN0IExPQ0FMSVpFX0NBQ0hFX05BTUUgPSAnTE9DQUxJWkVfREVGQVVMVF9MQU5HVUFHRSc7XG5cbmV4cG9ydCBjbGFzcyBMb2NhbGl6ZVJvdXRlclNldHRpbmdzIGltcGxlbWVudHMgTG9jYWxpemVSb3V0ZXJDb25maWcge1xuICAvKipcbiAgICogU2V0dGluZ3MgZm9yIGxvY2FsaXplIHJvdXRlclxuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgQEluamVjdChVU0VfQ0FDSEVEX0xBTkcpIHB1YmxpYyB1c2VDYWNoZWRMYW5nOiBib29sZWFuID0gdHJ1ZSxcbiAgICBASW5qZWN0KEFMV0FZU19TRVRfUFJFRklYKSBwdWJsaWMgYWx3YXlzU2V0UHJlZml4OiBib29sZWFuID0gdHJ1ZSxcbiAgICBASW5qZWN0KENBQ0hFX01FQ0hBTklTTSkgcHVibGljIGNhY2hlTWVjaGFuaXNtOiBDYWNoZU1lY2hhbmlzbSA9IENhY2hlTWVjaGFuaXNtLkxvY2FsU3RvcmFnZSxcbiAgICBASW5qZWN0KENBQ0hFX05BTUUpIHB1YmxpYyBjYWNoZU5hbWU6IHN0cmluZyA9IExPQ0FMSVpFX0NBQ0hFX05BTUUsXG4gICAgQEluamVjdChERUZBVUxUX0xBTkdfRlVOQ1RJT04pIHB1YmxpYyBkZWZhdWx0TGFuZ0Z1bmN0aW9uOiBEZWZhdWx0TGFuZ3VhZ2VGdW5jdGlvbiA9IHZvaWQgMFxuICApIHtcbiAgfVxufVxuIiwiaW1wb3J0IHsgUm91dGVzLCBSb3V0ZSB9IGZyb20gJ0Bhbmd1bGFyL3JvdXRlcic7XG5pbXBvcnQgeyBUcmFuc2xhdGVTZXJ2aWNlIH0gZnJvbSAnQG5neC10cmFuc2xhdGUvY29yZSc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlLCBPYnNlcnZlciB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgTG9jYXRpb24gfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHsgQ2FjaGVNZWNoYW5pc20sIExvY2FsaXplUm91dGVyU2V0dGluZ3MgfSBmcm9tICcuL2xvY2FsaXplLXJvdXRlci5jb25maWcnO1xuaW1wb3J0IHsgSW5qZWN0IH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmNvbnN0IENPT0tJRV9FWFBJUlkgPSAzMDsgLy8gMSBtb250aFxuXG4vKipcbiAqIEFic3RyYWN0IGNsYXNzIGZvciBwYXJzaW5nIGxvY2FsaXphdGlvblxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTG9jYWxpemVQYXJzZXIge1xuICBsb2NhbGVzOiBBcnJheTxzdHJpbmc+O1xuICBjdXJyZW50TGFuZzogc3RyaW5nO1xuICByb3V0ZXM6IFJvdXRlcztcbiAgZGVmYXVsdExhbmc6IHN0cmluZztcblxuICBwcm90ZWN0ZWQgcHJlZml4OiBzdHJpbmc7XG5cbiAgcHJpdmF0ZSBfdHJhbnNsYXRpb25PYmplY3Q6IGFueTtcbiAgcHJpdmF0ZSBfd2lsZGNhcmRSb3V0ZTogUm91dGU7XG4gIHByaXZhdGUgX2xhbmd1YWdlUm91dGU6IFJvdXRlO1xuXG4gIC8qKlxuICAgKiBMb2FkZXIgY29uc3RydWN0b3JcbiAgICovXG4gIGNvbnN0cnVjdG9yKEBJbmplY3QoVHJhbnNsYXRlU2VydmljZSkgcHJpdmF0ZSB0cmFuc2xhdGU6IFRyYW5zbGF0ZVNlcnZpY2UsXG4gICAgQEluamVjdChMb2NhdGlvbikgcHJpdmF0ZSBsb2NhdGlvbjogTG9jYXRpb24sXG4gICAgQEluamVjdChMb2NhbGl6ZVJvdXRlclNldHRpbmdzKSBwcml2YXRlIHNldHRpbmdzOiBMb2NhbGl6ZVJvdXRlclNldHRpbmdzKSB7XG4gIH1cblxuICAvKipcbiAgICogTG9hZCByb3V0ZXMgYW5kIGZldGNoIG5lY2Vzc2FyeSBkYXRhXG4gICAqL1xuICBhYnN0cmFjdCBsb2FkKHJvdXRlczogUm91dGVzKTogUHJvbWlzZTxhbnk+O1xuXG4gIC8qKlxuICogUHJlcGFyZSByb3V0ZXMgdG8gYmUgZnVsbHkgdXNhYmxlIGJ5IG5neC10cmFuc2xhdGUtcm91dGVyXG4gKiBAcGFyYW0gcm91dGVzXG4gKi9cbiAgLyogcHJpdmF0ZSBpbml0Um91dGVzKHJvdXRlczogUm91dGVzLCBwcmVmaXggPSAnJykge1xuICAgIHJvdXRlcy5mb3JFYWNoKHJvdXRlID0+IHtcbiAgICAgIGlmIChyb3V0ZS5wYXRoICE9PSAnKionKSB7XG4gICAgICAgIGNvbnN0IHJvdXRlRGF0YTogYW55ID0gcm91dGUuZGF0YSA9IHJvdXRlLmRhdGEgfHwge307XG4gICAgICAgIHJvdXRlRGF0YS5sb2NhbGl6ZVJvdXRlciA9IHt9O1xuICAgICAgICByb3V0ZURhdGEubG9jYWxpemVSb3V0ZXIuZnVsbFBhdGggPSBgJHtwcmVmaXh9LyR7cm91dGUucGF0aH1gO1xuICAgICAgICBpZiAocm91dGUuY2hpbGRyZW4gJiYgcm91dGUuY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHRoaXMuaW5pdFJvdXRlcyhyb3V0ZS5jaGlsZHJlbiwgcm91dGVEYXRhLmxvY2FsaXplUm91dGVyLmZ1bGxQYXRoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9ICovXG5cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBsYW5ndWFnZSBhbmQgcm91dGVzXG4gICAqL1xuICBwcm90ZWN0ZWQgaW5pdChyb3V0ZXM6IFJvdXRlcyk6IFByb21pc2U8YW55PiB7XG4gICAgbGV0IHNlbGVjdGVkTGFuZ3VhZ2U6IHN0cmluZztcblxuICAgIC8vIHRoaXMuaW5pdFJvdXRlcyhyb3V0ZXMpO1xuICAgIHRoaXMucm91dGVzID0gcm91dGVzO1xuXG4gICAgaWYgKCF0aGlzLmxvY2FsZXMgfHwgIXRoaXMubG9jYWxlcy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG4gICAgLyoqIGRldGVjdCBjdXJyZW50IGxhbmd1YWdlICovXG4gICAgY29uc3QgbG9jYXRpb25MYW5nID0gdGhpcy5nZXRMb2NhdGlvbkxhbmcoKTtcbiAgICBjb25zdCBicm93c2VyTGFuZyA9IHRoaXMuX2dldEJyb3dzZXJMYW5nKCk7XG5cbiAgICBpZiAodGhpcy5zZXR0aW5ncy5kZWZhdWx0TGFuZ0Z1bmN0aW9uKSB7XG4gICAgICB0aGlzLmRlZmF1bHRMYW5nID0gdGhpcy5zZXR0aW5ncy5kZWZhdWx0TGFuZ0Z1bmN0aW9uKHRoaXMubG9jYWxlcywgdGhpcy5fY2FjaGVkTGFuZywgYnJvd3NlckxhbmcpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRlZmF1bHRMYW5nID0gdGhpcy5fY2FjaGVkTGFuZyB8fCBicm93c2VyTGFuZyB8fCB0aGlzLmxvY2FsZXNbMF07XG4gICAgfVxuICAgIHNlbGVjdGVkTGFuZ3VhZ2UgPSBsb2NhdGlvbkxhbmcgfHwgdGhpcy5kZWZhdWx0TGFuZztcbiAgICB0aGlzLnRyYW5zbGF0ZS5zZXREZWZhdWx0TGFuZyh0aGlzLmRlZmF1bHRMYW5nKTtcblxuICAgIGxldCBjaGlsZHJlbjogUm91dGVzID0gW107XG4gICAgLyoqIGlmIHNldCBwcmVmaXggaXMgZW5mb3JjZWQgKi9cbiAgICBpZiAodGhpcy5zZXR0aW5ncy5hbHdheXNTZXRQcmVmaXgpIHtcbiAgICAgIGNvbnN0IGJhc2VSb3V0ZSA9IHsgcGF0aDogJycsIHJlZGlyZWN0VG86IHRoaXMuZGVmYXVsdExhbmcsIHBhdGhNYXRjaDogJ2Z1bGwnIH07XG5cbiAgICAgIC8qKiBleHRyYWN0IHBvdGVudGlhbCB3aWxkY2FyZCByb3V0ZSAqL1xuICAgICAgY29uc3Qgd2lsZGNhcmRJbmRleCA9IHJvdXRlcy5maW5kSW5kZXgoKHJvdXRlOiBSb3V0ZSkgPT4gcm91dGUucGF0aCA9PT0gJyoqJyk7XG4gICAgICBpZiAod2lsZGNhcmRJbmRleCAhPT0gLTEpIHtcbiAgICAgICAgdGhpcy5fd2lsZGNhcmRSb3V0ZSA9IHJvdXRlcy5zcGxpY2Uod2lsZGNhcmRJbmRleCwgMSlbMF07XG4gICAgICB9XG4gICAgICBjaGlsZHJlbiA9IHRoaXMucm91dGVzLnNwbGljZSgwLCB0aGlzLnJvdXRlcy5sZW5ndGgsIGJhc2VSb3V0ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNoaWxkcmVuID0gWy4uLnRoaXMucm91dGVzXTsgLy8gc2hhbGxvdyBjb3B5IG9mIHJvdXRlc1xuICAgIH1cblxuICAgIC8qKiBleGNsdWRlIGNlcnRhaW4gcm91dGVzICovXG4gICAgZm9yIChsZXQgaSA9IGNoaWxkcmVuLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICBpZiAoY2hpbGRyZW5baV0uZGF0YSAmJiBjaGlsZHJlbltpXS5kYXRhWydza2lwUm91dGVMb2NhbGl6YXRpb24nXSkge1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5hbHdheXNTZXRQcmVmaXgpIHtcbiAgICAgICAgICAvLyBhZGQgZGlyZWN0bHkgdG8gcm91dGVzXG4gICAgICAgICAgdGhpcy5yb3V0ZXMucHVzaChjaGlsZHJlbltpXSk7XG4gICAgICAgIH1cbiAgICAgICAgY2hpbGRyZW4uc3BsaWNlKGksIDEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBhcHBlbmQgY2hpbGRyZW4gcm91dGVzICovXG4gICAgaWYgKGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgaWYgKHRoaXMubG9jYWxlcy5sZW5ndGggPiAxIHx8IHRoaXMuc2V0dGluZ3MuYWx3YXlzU2V0UHJlZml4KSB7XG4gICAgICAgIHRoaXMuX2xhbmd1YWdlUm91dGUgPSB7IGNoaWxkcmVuOiBjaGlsZHJlbiB9O1xuICAgICAgICB0aGlzLnJvdXRlcy51bnNoaWZ0KHRoaXMuX2xhbmd1YWdlUm91dGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKiAuLi5hbmQgcG90ZW50aWFsIHdpbGRjYXJkIHJvdXRlICovXG4gICAgaWYgKHRoaXMuX3dpbGRjYXJkUm91dGUgJiYgdGhpcy5zZXR0aW5ncy5hbHdheXNTZXRQcmVmaXgpIHtcbiAgICAgIHRoaXMucm91dGVzLnB1c2godGhpcy5fd2lsZGNhcmRSb3V0ZSk7XG4gICAgfVxuXG4gICAgLyoqIHRyYW5zbGF0ZSByb3V0ZXMgKi9cbiAgICBjb25zdCByZXMgPSB0aGlzLnRyYW5zbGF0ZVJvdXRlcyhzZWxlY3RlZExhbmd1YWdlKTtcbiAgICByZXR1cm4gcmVzLnRvUHJvbWlzZSgpO1xuICB9XG5cbiAgaW5pdENoaWxkUm91dGVzKHJvdXRlczogUm91dGVzKSB7XG4gICAgdGhpcy5fdHJhbnNsYXRlUm91dGVUcmVlKHJvdXRlcyk7XG4gICAgcmV0dXJuIHJvdXRlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmFuc2xhdGUgcm91dGVzIHRvIHNlbGVjdGVkIGxhbmd1YWdlXG4gICAqL1xuICB0cmFuc2xhdGVSb3V0ZXMobGFuZ3VhZ2U6IHN0cmluZyk6IE9ic2VydmFibGU8YW55PiB7XG4gICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPGFueT4oKG9ic2VydmVyOiBPYnNlcnZlcjxhbnk+KSA9PiB7XG4gICAgICB0aGlzLl9jYWNoZWRMYW5nID0gbGFuZ3VhZ2U7XG4gICAgICBpZiAodGhpcy5fbGFuZ3VhZ2VSb3V0ZSkge1xuICAgICAgICB0aGlzLl9sYW5ndWFnZVJvdXRlLnBhdGggPSBsYW5ndWFnZTtcbiAgICAgIH1cblxuICAgICAgdGhpcy50cmFuc2xhdGUudXNlKGxhbmd1YWdlKS5zdWJzY3JpYmUoKHRyYW5zbGF0aW9uczogYW55KSA9PiB7XG4gICAgICAgIHRoaXMuX3RyYW5zbGF0aW9uT2JqZWN0ID0gdHJhbnNsYXRpb25zO1xuICAgICAgICB0aGlzLmN1cnJlbnRMYW5nID0gbGFuZ3VhZ2U7XG5cbiAgICAgICAgaWYgKHRoaXMuX2xhbmd1YWdlUm91dGUpIHtcbiAgICAgICAgICBpZiAodGhpcy5fbGFuZ3VhZ2VSb3V0ZSkge1xuICAgICAgICAgICAgdGhpcy5fdHJhbnNsYXRlUm91dGVUcmVlKHRoaXMuX2xhbmd1YWdlUm91dGUuY2hpbGRyZW4pO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBpZiB0aGVyZSBpcyB3aWxkY2FyZCByb3V0ZVxuICAgICAgICAgIGlmICh0aGlzLl93aWxkY2FyZFJvdXRlICYmIHRoaXMuX3dpbGRjYXJkUm91dGUucmVkaXJlY3RUbykge1xuICAgICAgICAgICAgdGhpcy5fdHJhbnNsYXRlUHJvcGVydHkodGhpcy5fd2lsZGNhcmRSb3V0ZSwgJ3JlZGlyZWN0VG8nLCB0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fdHJhbnNsYXRlUm91dGVUcmVlKHRoaXMucm91dGVzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9ic2VydmVyLm5leHQodm9pZCAwKTtcbiAgICAgICAgb2JzZXJ2ZXIuY29tcGxldGUoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyYW5zbGF0ZSB0aGUgcm91dGUgbm9kZSBhbmQgcmVjdXJzaXZlbHkgY2FsbCBmb3IgYWxsIGl0J3MgY2hpbGRyZW5cbiAgICovXG4gIHByaXZhdGUgX3RyYW5zbGF0ZVJvdXRlVHJlZShyb3V0ZXM6IFJvdXRlcyk6IHZvaWQge1xuICAgIHJvdXRlcy5mb3JFYWNoKChyb3V0ZTogUm91dGUpID0+IHtcbiAgICAgIGlmIChyb3V0ZS5wYXRoICYmIHJvdXRlLnBhdGggIT09ICcqKicpIHtcbiAgICAgICAgdGhpcy5fdHJhbnNsYXRlUHJvcGVydHkocm91dGUsICdwYXRoJyk7XG4gICAgICB9XG4gICAgICBpZiAocm91dGUucmVkaXJlY3RUbykge1xuICAgICAgICB0aGlzLl90cmFuc2xhdGVQcm9wZXJ0eShyb3V0ZSwgJ3JlZGlyZWN0VG8nLCAhcm91dGUucmVkaXJlY3RUby5pbmRleE9mKCcvJykpO1xuICAgICAgfVxuICAgICAgaWYgKHJvdXRlLmNoaWxkcmVuKSB7XG4gICAgICAgIHRoaXMuX3RyYW5zbGF0ZVJvdXRlVHJlZShyb3V0ZS5jaGlsZHJlbik7XG4gICAgICB9XG4gICAgICBpZiAocm91dGUubG9hZENoaWxkcmVuICYmICg8YW55PnJvdXRlKS5fbG9hZGVkQ29uZmlnKSB7XG4gICAgICAgIHRoaXMuX3RyYW5zbGF0ZVJvdXRlVHJlZSgoPGFueT5yb3V0ZSkuX2xvYWRlZENvbmZpZy5yb3V0ZXMpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyYW5zbGF0ZSBwcm9wZXJ0eVxuICAgKiBJZiBmaXJzdCB0aW1lIHRyYW5zbGF0aW9uIHRoZW4gYWRkIG9yaWdpbmFsIHRvIHJvdXRlIGRhdGEgb2JqZWN0XG4gICAqL1xuICBwcml2YXRlIF90cmFuc2xhdGVQcm9wZXJ0eShyb3V0ZTogUm91dGUsIHByb3BlcnR5OiBzdHJpbmcsIHByZWZpeExhbmc/OiBib29sZWFuKTogdm9pZCB7XG4gICAgLy8gc2V0IHByb3BlcnR5IHRvIGRhdGEgaWYgbm90IHRoZXJlIHlldFxuICAgIGNvbnN0IHJvdXRlRGF0YTogYW55ID0gcm91dGUuZGF0YSA9IHJvdXRlLmRhdGEgfHwge307XG4gICAgaWYgKCFyb3V0ZURhdGEubG9jYWxpemVSb3V0ZXIpIHtcbiAgICAgIHJvdXRlRGF0YS5sb2NhbGl6ZVJvdXRlciA9IHt9O1xuICAgIH1cbiAgICBpZiAoIXJvdXRlRGF0YS5sb2NhbGl6ZVJvdXRlcltwcm9wZXJ0eV0pIHtcbiAgICAgIHJvdXRlRGF0YS5sb2NhbGl6ZVJvdXRlcltwcm9wZXJ0eV0gPSAoPGFueT5yb3V0ZSlbcHJvcGVydHldO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMudHJhbnNsYXRlUm91dGUocm91dGVEYXRhLmxvY2FsaXplUm91dGVyW3Byb3BlcnR5XSk7XG4gICAgKDxhbnk+cm91dGUpW3Byb3BlcnR5XSA9IHByZWZpeExhbmcgPyBgLyR7dGhpcy51cmxQcmVmaXh9JHtyZXN1bHR9YCA6IHJlc3VsdDtcbiAgfVxuXG4gIGdldCB1cmxQcmVmaXgoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2V0dGluZ3MuYWx3YXlzU2V0UHJlZml4IHx8IHRoaXMuY3VycmVudExhbmcgIT09IHRoaXMuZGVmYXVsdExhbmcgPyB0aGlzLmN1cnJlbnRMYW5nIDogJyc7XG4gIH1cblxuICAvKipcbiAgICogVHJhbnNsYXRlIHJvdXRlIGFuZCByZXR1cm4gb2JzZXJ2YWJsZVxuICAgKi9cbiAgdHJhbnNsYXRlUm91dGUocGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBxdWVyeVBhcnRzID0gcGF0aC5zcGxpdCgnPycpO1xuICAgIGlmIChxdWVyeVBhcnRzLmxlbmd0aCA+IDIpIHtcbiAgICAgIHRocm93IEVycm9yKCdUaGVyZSBzaG91bGQgYmUgb25seSBvbmUgcXVlcnkgcGFyYW1ldGVyIGJsb2NrIGluIHRoZSBVUkwnKTtcbiAgICB9XG4gICAgY29uc3QgcGF0aFNlZ21lbnRzID0gcXVlcnlQYXJ0c1swXS5zcGxpdCgnLycpO1xuXG4gICAgLyoqIGNvbGxlY3Qgb2JzZXJ2YWJsZXMgICovXG4gICAgcmV0dXJuIHBhdGhTZWdtZW50c1xuICAgICAgLm1hcCgocGFydDogc3RyaW5nKSA9PiBwYXJ0Lmxlbmd0aCA/IHRoaXMudHJhbnNsYXRlVGV4dChwYXJ0KSA6IHBhcnQpXG4gICAgICAuam9pbignLycpICtcbiAgICAgIChxdWVyeVBhcnRzLmxlbmd0aCA+IDEgPyBgPyR7cXVlcnlQYXJ0c1sxXX1gIDogJycpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBsYW5ndWFnZSBmcm9tIHVybFxuICAgKi9cbiAgZ2V0TG9jYXRpb25MYW5nKHVybD86IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgcXVlcnlQYXJhbVNwbGl0ID0gKHVybCB8fCB0aGlzLmxvY2F0aW9uLnBhdGgoKSkuc3BsaXQoJz8nKTtcbiAgICBsZXQgcGF0aFNsaWNlczogc3RyaW5nW10gPSBbXTtcbiAgICBpZiAocXVlcnlQYXJhbVNwbGl0Lmxlbmd0aCA+IDApIHtcbiAgICAgIHBhdGhTbGljZXMgPSBxdWVyeVBhcmFtU3BsaXRbMF0uc3BsaXQoJy8nKTtcbiAgICB9XG4gICAgaWYgKHBhdGhTbGljZXMubGVuZ3RoID4gMSAmJiB0aGlzLmxvY2FsZXMuaW5kZXhPZihwYXRoU2xpY2VzWzFdKSAhPT0gLTEpIHtcbiAgICAgIHJldHVybiBwYXRoU2xpY2VzWzFdO1xuICAgIH1cbiAgICBpZiAocGF0aFNsaWNlcy5sZW5ndGggJiYgdGhpcy5sb2NhbGVzLmluZGV4T2YocGF0aFNsaWNlc1swXSkgIT09IC0xKSB7XG4gICAgICByZXR1cm4gcGF0aFNsaWNlc1swXTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHVzZXIncyBsYW5ndWFnZSBzZXQgaW4gdGhlIGJyb3dzZXJcbiAgICovXG4gIHByaXZhdGUgX2dldEJyb3dzZXJMYW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX3JldHVybklmSW5Mb2NhbGVzKHRoaXMudHJhbnNsYXRlLmdldEJyb3dzZXJMYW5nKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBsYW5ndWFnZSBmcm9tIGxvY2FsIHN0b3JhZ2Ugb3IgY29va2llXG4gICAqL1xuICBwcml2YXRlIGdldCBfY2FjaGVkTGFuZygpOiBzdHJpbmcge1xuICAgIGlmICghdGhpcy5zZXR0aW5ncy51c2VDYWNoZWRMYW5nKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0aGlzLnNldHRpbmdzLmNhY2hlTWVjaGFuaXNtID09PSBDYWNoZU1lY2hhbmlzbS5Mb2NhbFN0b3JhZ2UpIHtcbiAgICAgIHJldHVybiB0aGlzLl9jYWNoZVdpdGhMb2NhbFN0b3JhZ2UoKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuc2V0dGluZ3MuY2FjaGVNZWNoYW5pc20gPT09IENhY2hlTWVjaGFuaXNtLkNvb2tpZSkge1xuICAgICAgcmV0dXJuIHRoaXMuX2NhY2hlV2l0aENvb2tpZXMoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2F2ZSBsYW5ndWFnZSB0byBsb2NhbCBzdG9yYWdlIG9yIGNvb2tpZVxuICAgKi9cbiAgcHJpdmF0ZSBzZXQgX2NhY2hlZExhbmcodmFsdWU6IHN0cmluZykge1xuICAgIGlmICghdGhpcy5zZXR0aW5ncy51c2VDYWNoZWRMYW5nKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0aGlzLnNldHRpbmdzLmNhY2hlTWVjaGFuaXNtID09PSBDYWNoZU1lY2hhbmlzbS5Mb2NhbFN0b3JhZ2UpIHtcbiAgICAgIHRoaXMuX2NhY2hlV2l0aExvY2FsU3RvcmFnZSh2YWx1ZSk7XG4gICAgfVxuICAgIGlmICh0aGlzLnNldHRpbmdzLmNhY2hlTWVjaGFuaXNtID09PSBDYWNoZU1lY2hhbmlzbS5Db29raWUpIHtcbiAgICAgIHRoaXMuX2NhY2hlV2l0aENvb2tpZXModmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDYWNoZSB2YWx1ZSB0byBsb2NhbCBzdG9yYWdlXG4gICAqL1xuICBwcml2YXRlIF9jYWNoZVdpdGhMb2NhbFN0b3JhZ2UodmFsdWU/OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGlmICh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyB8fCB0eXBlb2Ygd2luZG93LmxvY2FsU3RvcmFnZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0odGhpcy5zZXR0aW5ncy5jYWNoZU5hbWUsIHZhbHVlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuX3JldHVybklmSW5Mb2NhbGVzKHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSh0aGlzLnNldHRpbmdzLmNhY2hlTmFtZSkpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIHdlaXJkIFNhZmFyaSBpc3N1ZSBpbiBwcml2YXRlIG1vZGUsIHdoZXJlIExvY2FsU3RvcmFnZSBpcyBkZWZpbmVkIGJ1dCB0aHJvd3MgZXJyb3Igb24gYWNjZXNzXG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENhY2hlIHZhbHVlIHZpYSBjb29raWVzXG4gICAqL1xuICBwcml2YXRlIF9jYWNoZVdpdGhDb29raWVzKHZhbHVlPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBpZiAodHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJyB8fCB0eXBlb2YgZG9jdW1lbnQuY29va2llID09PSAndW5kZWZpbmVkJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgbmFtZSA9IGVuY29kZVVSSUNvbXBvbmVudCh0aGlzLnNldHRpbmdzLmNhY2hlTmFtZSk7XG4gICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgY29uc3QgZDogRGF0ZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgIGQuc2V0VGltZShkLmdldFRpbWUoKSArIENPT0tJRV9FWFBJUlkgKiA4NjQwMDAwMCk7IC8vICogZGF5c1xuICAgICAgICBkb2N1bWVudC5jb29raWUgPSBgJHtuYW1lfT0ke2VuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSl9O2V4cGlyZXM9JHtkLnRvVVRDU3RyaW5nKCl9YDtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVnZXhwID0gbmV3IFJlZ0V4cCgnKD86XicgKyBuYW1lICsgJ3w7XFxcXHMqJyArIG5hbWUgKyAnKT0oLio/KSg/Ojt8JCknLCAnZycpO1xuICAgICAgY29uc3QgcmVzdWx0ID0gcmVnZXhwLmV4ZWMoZG9jdW1lbnQuY29va2llKTtcbiAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQocmVzdWx0WzFdKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm47IC8vIHNob3VsZCBub3QgaGFwcGVuIGJ1dCBiZXR0ZXIgc2FmZSB0aGFuIHNvcnJ5XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIHZhbHVlIGV4aXN0cyBpbiBsb2NhbGVzIGxpc3RcbiAgICovXG4gIHByaXZhdGUgX3JldHVybklmSW5Mb2NhbGVzKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGlmICh2YWx1ZSAmJiB0aGlzLmxvY2FsZXMuaW5kZXhPZih2YWx1ZSkgIT09IC0xKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0cmFuc2xhdGVkIHZhbHVlXG4gICAqL1xuICBwcml2YXRlIHRyYW5zbGF0ZVRleHQoa2V5OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGlmICghdGhpcy5fdHJhbnNsYXRpb25PYmplY3QpIHtcbiAgICAgIHJldHVybiBrZXk7XG4gICAgfVxuICAgIGNvbnN0IGZ1bGxLZXkgPSB0aGlzLnByZWZpeCArIGtleTtcbiAgICBjb25zdCByZXMgPSB0aGlzLnRyYW5zbGF0ZS5nZXRQYXJzZWRSZXN1bHQodGhpcy5fdHJhbnNsYXRpb25PYmplY3QsIGZ1bGxLZXkpO1xuICAgIHJldHVybiByZXMgIT09IGZ1bGxLZXkgPyByZXMgOiBrZXk7XG4gIH1cbn1cblxuLyoqXG4gKiBNYW51YWxseSBzZXQgY29uZmlndXJhdGlvblxuICovXG5leHBvcnQgY2xhc3MgTWFudWFsUGFyc2VyTG9hZGVyIGV4dGVuZHMgTG9jYWxpemVQYXJzZXIge1xuXG4gIC8qKlxuICAgKiBDVE9SXG4gICAqL1xuICBjb25zdHJ1Y3Rvcih0cmFuc2xhdGU6IFRyYW5zbGF0ZVNlcnZpY2UsIGxvY2F0aW9uOiBMb2NhdGlvbiwgc2V0dGluZ3M6IExvY2FsaXplUm91dGVyU2V0dGluZ3MsXG4gICAgbG9jYWxlczogc3RyaW5nW10gPSBbJ2VuJ10sIHByZWZpeDogc3RyaW5nID0gJ1JPVVRFUy4nKSB7XG4gICAgc3VwZXIodHJhbnNsYXRlLCBsb2NhdGlvbiwgc2V0dGluZ3MpO1xuICAgIHRoaXMubG9jYWxlcyA9IGxvY2FsZXM7XG4gICAgdGhpcy5wcmVmaXggPSBwcmVmaXggfHwgJyc7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBvciBhcHBlbmQgcm91dGVzXG4gICAqL1xuICBsb2FkKHJvdXRlczogUm91dGVzKTogUHJvbWlzZTxhbnk+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmU6IGFueSkgPT4ge1xuICAgICAgdGhpcy5pbml0KHJvdXRlcykudGhlbihyZXNvbHZlKTtcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRHVtbXlMb2NhbGl6ZVBhcnNlciBleHRlbmRzIExvY2FsaXplUGFyc2VyIHtcbiAgbG9hZChyb3V0ZXM6IFJvdXRlcyk6IFByb21pc2U8YW55PiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlOiBhbnkpID0+IHtcbiAgICAgIHRoaXMuaW5pdChyb3V0ZXMpLnRoZW4ocmVzb2x2ZSk7XG4gICAgfSk7XG4gIH1cbn1cbiIsImltcG9ydCB7IEluamVjdCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgUm91dGVyLCBOYXZpZ2F0aW9uU3RhcnQsIEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIE5hdmlnYXRpb25FeHRyYXMsIFVybFNlZ21lbnQsIEFjdGl2YXRlZFJvdXRlIH0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcbmltcG9ydCB7IFN1YmplY3QgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGZpbHRlciwgcGFpcndpc2UgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7IExvY2FsaXplUGFyc2VyIH0gZnJvbSAnLi9sb2NhbGl6ZS1yb3V0ZXIucGFyc2VyJztcbmltcG9ydCB7IExvY2FsaXplUm91dGVyU2V0dGluZ3MgfSBmcm9tICcuL2xvY2FsaXplLXJvdXRlci5jb25maWcnO1xuXG4vKipcbiAqIExvY2FsaXphdGlvbiBzZXJ2aWNlXG4gKiBtb2RpZnlSb3V0ZXNcbiAqL1xuZXhwb3J0IGNsYXNzIExvY2FsaXplUm91dGVyU2VydmljZSB7XG4gIHJvdXRlckV2ZW50czogU3ViamVjdDxzdHJpbmc+O1xuXG4gIC8qKlxuICAgKiBDVE9SXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIEBJbmplY3QoTG9jYWxpemVQYXJzZXIpIHB1YmxpYyBwYXJzZXI6IExvY2FsaXplUGFyc2VyLFxuICAgICAgQEluamVjdChMb2NhbGl6ZVJvdXRlclNldHRpbmdzKSBwdWJsaWMgc2V0dGluZ3M6IExvY2FsaXplUm91dGVyU2V0dGluZ3MsXG4gICAgICBASW5qZWN0KFJvdXRlcikgcHJpdmF0ZSByb3V0ZXI6IFJvdXRlcixcbiAgICAgIEBJbmplY3QoQWN0aXZhdGVkUm91dGUpIHByaXZhdGUgcm91dGU6IEFjdGl2YXRlZFJvdXRlXG4gICAgKSB7XG4gICAgICB0aGlzLnJvdXRlckV2ZW50cyA9IG5ldyBTdWJqZWN0PHN0cmluZz4oKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdGFydCB1cCB0aGUgc2VydmljZVxuICAgKi9cbiAgaW5pdCgpOiB2b2lkIHtcbiAgICB0aGlzLnJvdXRlci5yZXNldENvbmZpZyh0aGlzLnBhcnNlci5yb3V0ZXMpO1xuICAgIC8vIHN1YnNjcmliZSB0byByb3V0ZXIgZXZlbnRzXG4gICAgdGhpcy5yb3V0ZXIuZXZlbnRzXG4gICAgICAucGlwZShcbiAgICAgICAgZmlsdGVyKGV2ZW50ID0+IGV2ZW50IGluc3RhbmNlb2YgTmF2aWdhdGlvblN0YXJ0KSxcbiAgICAgICAgcGFpcndpc2UoKVxuICAgICAgKVxuICAgICAgLnN1YnNjcmliZSh0aGlzLl9yb3V0ZUNoYW5nZWQoKSk7XG4gIH1cblxuICAvKipcbiAgICogQ2hhbmdlIGxhbmd1YWdlIGFuZCBuYXZpZ2F0ZSB0byB0cmFuc2xhdGVkIHJvdXRlXG4gICAqL1xuICBjaGFuZ2VMYW5ndWFnZShsYW5nOiBzdHJpbmcsIGV4dHJhcz86IE5hdmlnYXRpb25FeHRyYXMsIHVzZU5hdmlnYXRlTWV0aG9kPzogYm9vbGVhbik6IHZvaWQge1xuICAgIGlmICh0aGlzLnJvdXRlKSB7XG4gICAgICBjb25zb2xlLmxvZyh0aGlzLnJvdXRlKTtcbiAgICB9XG4gICAgaWYgKGxhbmcgIT09IHRoaXMucGFyc2VyLmN1cnJlbnRMYW5nKSB7XG4gICAgICBjb25zdCByb290U25hcHNob3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QgPSB0aGlzLnJvdXRlci5yb3V0ZXJTdGF0ZS5zbmFwc2hvdC5yb290O1xuXG4gICAgICB0aGlzLnBhcnNlci50cmFuc2xhdGVSb3V0ZXMobGFuZykuc3Vic2NyaWJlKCgpID0+IHtcblxuICAgICAgICBjb25zdCBxdWVyeVBhcmFtcyA9IHJvb3RTbmFwc2hvdC5xdWVyeVBhcmFtcztcbiAgICAgICAgbGV0IHVybCA9ICcnO1xuICAgICAgICBpZiAoT2JqZWN0LmtleXMocXVlcnlQYXJhbXMpLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICAgIGNvbnN0IHF1ZXJ5U3RyaW5nID0gT2JqZWN0LmtleXMocXVlcnlQYXJhbXMpLm1hcChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICByZXR1cm4ga2V5ICsgJz0nICsgcXVlcnlQYXJhbXNba2V5XVxuICAgICAgICAgIH0pLmpvaW4oJyYnKTtcbiAgICAgICAgICB1cmwgPSB0aGlzLnRyYXZlcnNlUm91dGVTbmFwc2hvdChyb290U25hcHNob3QpICsgJz8nICsgcXVlcnlTdHJpbmc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdXJsID0gdGhpcy50cmF2ZXJzZVJvdXRlU25hcHNob3Qocm9vdFNuYXBzaG90KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5hbHdheXNTZXRQcmVmaXgpIHtcbiAgICAgICAgICBsZXQgdXJsU2VnbWVudHMgPSB1cmwuc3BsaXQoJy8nKTtcbiAgICAgICAgICBjb25zdCBsYW5ndWFnZVNlZ21lbnRJbmRleCA9IHVybFNlZ21lbnRzLmluZGV4T2YodGhpcy5wYXJzZXIuY3VycmVudExhbmcpO1xuICAgICAgICAgIC8vIElmIHRoZSBkZWZhdWx0IGxhbmd1YWdlIGhhcyBubyBwcmVmaXggbWFrZSBzdXJlIHRvIHJlbW92ZSBhbmQgYWRkIGl0IHdoZW4gbmVjZXNzYXJ5XG4gICAgICAgICAgaWYgKHRoaXMucGFyc2VyLmN1cnJlbnRMYW5nID09PSB0aGlzLnBhcnNlci5kZWZhdWx0TGFuZykge1xuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBsYW5ndWFnZSBwcmVmaXggZnJvbSB1cmwgd2hlbiBjdXJyZW50IGxhbmd1YWdlIGlzIHRoZSBkZWZhdWx0IGxhbmd1YWdlXG4gICAgICAgICAgICBpZiAobGFuZ3VhZ2VTZWdtZW50SW5kZXggPT09IDAgfHwgKGxhbmd1YWdlU2VnbWVudEluZGV4ID09PSAxICYmIHVybFNlZ21lbnRzWzBdID09PSAnJykpIHtcbiAgICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBjdXJyZW50IGFrYSBkZWZhdWx0IGxhbmd1YWdlIHByZWZpeCBmcm9tIHRoZSB1cmxcbiAgICAgICAgICAgICAgdXJsU2VnbWVudHMgPSB1cmxTZWdtZW50cy5zbGljZSgwLCBsYW5ndWFnZVNlZ21lbnRJbmRleCkuY29uY2F0KHVybFNlZ21lbnRzLnNsaWNlKGxhbmd1YWdlU2VnbWVudEluZGV4ICsgMSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBXaGVuIGNvbWluZyBmcm9tIGEgZGVmYXVsdCBsYW5ndWFnZSBpdCdzIHBvc3NpYmxlIHRoYXQgdGhlIHVybCBkb2Vzbid0IGNvbnRhaW4gdGhlIGxhbmd1YWdlLCBtYWtlIHN1cmUgaXQgZG9lcy5cbiAgICAgICAgICAgIGlmIChsYW5ndWFnZVNlZ21lbnRJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgLy8gSWYgdGhlIHVybCBzdGFydHMgd2l0aCBhIHNsYXNoIG1ha2Ugc3VyZSB0byBrZWVwIGl0LlxuICAgICAgICAgICAgICBjb25zdCBpbmplY3Rpb25JbmRleCA9IHVybFNlZ21lbnRzWzBdID09PSAnJyA/IDEgOiAwO1xuICAgICAgICAgICAgICB1cmxTZWdtZW50cyA9IHVybFNlZ21lbnRzLnNsaWNlKDAsIGluamVjdGlvbkluZGV4KS5jb25jYXQodGhpcy5wYXJzZXIuY3VycmVudExhbmcsIHVybFNlZ21lbnRzLnNsaWNlKGluamVjdGlvbkluZGV4KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHVybCA9IHVybFNlZ21lbnRzLmpvaW4oJy8nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucm91dGVyLnJlc2V0Q29uZmlnKHRoaXMucGFyc2VyLnJvdXRlcyk7XG4gICAgICAgIGlmICh1c2VOYXZpZ2F0ZU1ldGhvZCkge1xuICAgICAgICAgIHRoaXMucm91dGVyLm5hdmlnYXRlKFt1cmxdLCBleHRyYXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMucm91dGVyLm5hdmlnYXRlQnlVcmwodXJsLCBleHRyYXMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVHJhdmVyc2VzIHRocm91Z2ggdGhlIHRyZWUgdG8gYXNzZW1ibGUgbmV3IHRyYW5zbGF0ZWQgdXJsXG4gICAqL1xuICBwcml2YXRlIHRyYXZlcnNlUm91dGVTbmFwc2hvdChzbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6IHN0cmluZyB7XG5cbiAgICBpZiAoc25hcHNob3QuZmlyc3RDaGlsZCAmJiBzbmFwc2hvdC5yb3V0ZUNvbmZpZykge1xuICAgICAgcmV0dXJuIGAke3RoaXMucGFyc2VTZWdtZW50VmFsdWUoc25hcHNob3QpfS8ke3RoaXMudHJhdmVyc2VSb3V0ZVNuYXBzaG90KHNuYXBzaG90LmZpcnN0Q2hpbGQpfWA7XG4gICAgfSBlbHNlIGlmIChzbmFwc2hvdC5maXJzdENoaWxkKSB7XG4gICAgICByZXR1cm4gdGhpcy50cmF2ZXJzZVJvdXRlU25hcHNob3Qoc25hcHNob3QuZmlyc3RDaGlsZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnBhcnNlU2VnbWVudFZhbHVlKHNuYXBzaG90KTtcbiAgICB9XG5cbiAgICAvKiBpZiAoc25hcHNob3QuZmlyc3RDaGlsZCAmJiBzbmFwc2hvdC5maXJzdENoaWxkLnJvdXRlQ29uZmlnICYmIHNuYXBzaG90LmZpcnN0Q2hpbGQucm91dGVDb25maWcucGF0aCkge1xuICAgICAgaWYgKHNuYXBzaG90LmZpcnN0Q2hpbGQucm91dGVDb25maWcucGF0aCAhPT0gJyoqJykge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJzZVNlZ21lbnRWYWx1ZShzbmFwc2hvdCkgKyAnLycgKyB0aGlzLnRyYXZlcnNlUm91dGVTbmFwc2hvdChzbmFwc2hvdC5maXJzdENoaWxkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLnBhcnNlU2VnbWVudFZhbHVlKHNuYXBzaG90LmZpcnN0Q2hpbGQpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5wYXJzZVNlZ21lbnRWYWx1ZShzbmFwc2hvdCk7ICovXG4gIH1cblxuICAvKipcbiAgICogRXh0cmFjdHMgbmV3IHNlZ21lbnQgdmFsdWUgYmFzZWQgb24gcm91dGVDb25maWcgYW5kIHVybFxuICAgKi9cbiAgcHJpdmF0ZSBwYXJzZVNlZ21lbnRWYWx1ZShzbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6IHN0cmluZyB7XG4gICAgaWYgKHNuYXBzaG90LmRhdGEubG9jYWxpemVSb3V0ZXIpIHtcbiAgICAgIGNvbnN0IHBhdGggPSBzbmFwc2hvdC5kYXRhLmxvY2FsaXplUm91dGVyLnBhdGg7XG4gICAgICBjb25zdCBzdWJQYXRoU2VnbWVudHMgPSBwYXRoLnNwbGl0KCcvJyk7XG4gICAgICByZXR1cm4gc3ViUGF0aFNlZ21lbnRzLm1hcCgoczogc3RyaW5nLCBpOiBudW1iZXIpID0+IHMuaW5kZXhPZignOicpID09PSAwID8gc25hcHNob3QudXJsW2ldLnBhdGggOiBzKS5qb2luKCcvJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG4gICAgLyogaWYgKHNuYXBzaG90LnJvdXRlQ29uZmlnKSB7XG4gICAgICBpZiAoc25hcHNob3Qucm91dGVDb25maWcucGF0aCA9PT0gJyoqJykge1xuICAgICAgICByZXR1cm4gc25hcHNob3QudXJsLmZpbHRlcigoc2VnbWVudDogVXJsU2VnbWVudCkgPT4gc2VnbWVudC5wYXRoKS5tYXAoKHNlZ21lbnQ6IFVybFNlZ21lbnQpID0+IHNlZ21lbnQucGF0aCkuam9pbignLycpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qgc3ViUGF0aFNlZ21lbnRzID0gc25hcHNob3Qucm91dGVDb25maWcucGF0aC5zcGxpdCgnLycpO1xuICAgICAgICByZXR1cm4gc3ViUGF0aFNlZ21lbnRzLm1hcCgoczogc3RyaW5nLCBpOiBudW1iZXIpID0+IHMuaW5kZXhPZignOicpID09PSAwID8gc25hcHNob3QudXJsW2ldLnBhdGggOiBzKS5qb2luKCcvJyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAnJzsgKi9cbiAgfVxuXG4gIC8qKlxuICAgKiBUcmFuc2xhdGUgcm91dGUgdG8gY3VycmVudCBsYW5ndWFnZVxuICAgKiBJZiBuZXcgbGFuZ3VhZ2UgaXMgZXhwbGljaXRseSBwcm92aWRlZCB0aGVuIHJlcGxhY2UgbGFuZ3VhZ2UgcGFydCBpbiB1cmwgd2l0aCBuZXcgbGFuZ3VhZ2VcbiAgICovXG4gIHRyYW5zbGF0ZVJvdXRlKHBhdGg6IHN0cmluZyB8IGFueVtdKTogc3RyaW5nIHwgYW55W10ge1xuICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNvbnN0IHVybCA9IHRoaXMucGFyc2VyLnRyYW5zbGF0ZVJvdXRlKHBhdGgpO1xuICAgICAgcmV0dXJuICFwYXRoLmluZGV4T2YoJy8nKSA/IGAvJHt0aGlzLnBhcnNlci51cmxQcmVmaXh9JHt1cmx9YCA6IHVybDtcbiAgICB9XG4gICAgLy8gaXQncyBhbiBhcnJheVxuICAgIGNvbnN0IHJlc3VsdDogYW55W10gPSBbXTtcbiAgICAocGF0aCBhcyBBcnJheTxhbnk+KS5mb3JFYWNoKChzZWdtZW50OiBhbnksIGluZGV4OiBudW1iZXIpID0+IHtcbiAgICAgIGlmICh0eXBlb2Ygc2VnbWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgY29uc3QgcmVzID0gdGhpcy5wYXJzZXIudHJhbnNsYXRlUm91dGUoc2VnbWVudCk7XG4gICAgICAgIGlmICghaW5kZXggJiYgIXNlZ21lbnQuaW5kZXhPZignLycpKSB7XG4gICAgICAgICAgcmVzdWx0LnB1c2goYC8ke3RoaXMucGFyc2VyLnVybFByZWZpeH0ke3Jlc31gKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQucHVzaChyZXMpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHQucHVzaChzZWdtZW50KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEV2ZW50IGhhbmRsZXIgdG8gcmVhY3Qgb24gcm91dGUgY2hhbmdlXG4gICAqL1xuICBwcml2YXRlIF9yb3V0ZUNoYW5nZWQoKTogKGV2ZW50UGFpcjogW05hdmlnYXRpb25TdGFydCwgTmF2aWdhdGlvblN0YXJ0XSkgPT4gdm9pZCB7XG4gICAgcmV0dXJuIChbcHJldmlvdXNFdmVudCwgY3VycmVudEV2ZW50XTogW05hdmlnYXRpb25TdGFydCwgTmF2aWdhdGlvblN0YXJ0XSkgPT4ge1xuICAgICAgY29uc3QgcHJldmlvdXNMYW5nID0gdGhpcy5wYXJzZXIuZ2V0TG9jYXRpb25MYW5nKHByZXZpb3VzRXZlbnQudXJsKSB8fCB0aGlzLnBhcnNlci5kZWZhdWx0TGFuZztcbiAgICAgIGNvbnN0IGN1cnJlbnRMYW5nID0gdGhpcy5wYXJzZXIuZ2V0TG9jYXRpb25MYW5nKGN1cnJlbnRFdmVudC51cmwpIHx8IHRoaXMucGFyc2VyLmRlZmF1bHRMYW5nO1xuXG4gICAgICBpZiAoY3VycmVudExhbmcgIT09IHByZXZpb3VzTGFuZykge1xuICAgICAgICB0aGlzLnBhcnNlci50cmFuc2xhdGVSb3V0ZXMoY3VycmVudExhbmcpLnN1YnNjcmliZSgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5yb3V0ZXIucmVzZXRDb25maWcodGhpcy5wYXJzZXIucm91dGVzKTtcbiAgICAgICAgICAvLyBGaXJlIHJvdXRlIGNoYW5nZSBldmVudFxuICAgICAgICAgIHRoaXMucm91dGVyRXZlbnRzLm5leHQoY3VycmVudExhbmcpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG59XG4iLCIvKipcbiAqIENvbXBhcmUgaWYgdHdvIG9iamVjdHMgYXJlIHNhbWVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVxdWFscyhvMTogYW55LCBvMjogYW55KTogYm9vbGVhbiB7XG4gIGlmIChvMSA9PT0gbzIpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBpZiAobzEgPT09IG51bGwgfHwgbzIgPT09IG51bGwpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKG8xICE9PSBvMSAmJiBvMiAhPT0gbzIpIHtcbiAgICByZXR1cm4gdHJ1ZTsgLy8gTmFOID09PSBOYU5cbiAgfVxuICBjb25zdCB0MSA9IHR5cGVvZiBvMSxcbiAgICB0MiA9IHR5cGVvZiBvMjtcbiAgbGV0IGxlbmd0aDogbnVtYmVyLFxuICAgIGtleTogYW55LFxuICAgIGtleVNldDogYW55O1xuXG4gIGlmICh0MSA9PT0gdDIgJiYgdDEgPT09ICdvYmplY3QnKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkobzEpKSB7XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkobzIpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICgobGVuZ3RoID0gbzEubGVuZ3RoKSA9PT0gbzIubGVuZ3RoKSB7XG4gICAgICAgIGZvciAoa2V5ID0gMDsga2V5IDwgbGVuZ3RoOyBrZXkrKykge1xuICAgICAgICAgIGlmICghZXF1YWxzKG8xW2tleV0sIG8yW2tleV0pKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShvMikpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAga2V5U2V0ID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgIGZvciAoa2V5IGluIG8xKSB7XG4gICAgICAgIGlmIChvMS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgaWYgKCFlcXVhbHMobzFba2V5XSwgbzJba2V5XSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAga2V5U2V0W2tleV0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKGtleSBpbiBvMikge1xuICAgICAgICBpZiAobzIuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGlmICghKGtleSBpbiBrZXlTZXQpICYmIHR5cGVvZiBvMltrZXldICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cbiIsImltcG9ydCB7IFBpcGVUcmFuc2Zvcm0sIFBpcGUsIENoYW5nZURldGVjdG9yUmVmLCBPbkRlc3Ryb3kgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IExvY2FsaXplUm91dGVyU2VydmljZSB9IGZyb20gJy4vbG9jYWxpemUtcm91dGVyLnNlcnZpY2UnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBlcXVhbHMgfSBmcm9tICcuL3V0aWwnO1xuXG5jb25zdCBWSUVXX0RFU1RST1lFRF9TVEFURSA9IDEyODtcblxuQFBpcGUoe1xuICBuYW1lOiAnbG9jYWxpemUnLFxuICBwdXJlOiBmYWxzZSAvLyByZXF1aXJlZCB0byB1cGRhdGUgdGhlIHZhbHVlIHdoZW4gdGhlIHByb21pc2UgaXMgcmVzb2x2ZWRcbn0pXG5leHBvcnQgY2xhc3MgTG9jYWxpemVSb3V0ZXJQaXBlIGltcGxlbWVudHMgUGlwZVRyYW5zZm9ybSwgT25EZXN0cm95IHtcbiAgcHJpdmF0ZSB2YWx1ZTogc3RyaW5nIHwgYW55W10gPSAnJztcbiAgcHJpdmF0ZSBsYXN0S2V5OiBzdHJpbmcgfCBhbnlbXTtcbiAgcHJpdmF0ZSBsYXN0TGFuZ3VhZ2U6IHN0cmluZztcbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb246IFN1YnNjcmlwdGlvbjtcblxuICAvKipcbiAgICogQ1RPUlxuICAgKi9cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBsb2NhbGl6ZTogTG9jYWxpemVSb3V0ZXJTZXJ2aWNlLCBwcml2YXRlIF9yZWY6IENoYW5nZURldGVjdG9yUmVmKSB7XG4gICAgdGhpcy5zdWJzY3JpcHRpb24gPSB0aGlzLmxvY2FsaXplLnJvdXRlckV2ZW50cy5zdWJzY3JpYmUoKCkgPT4ge1xuICAgICAgdGhpcy50cmFuc2Zvcm0odGhpcy5sYXN0S2V5KTtcbiAgICB9KTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCkge1xuICAgIGlmICh0aGlzLnN1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5zdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVHJhbnNmb3JtIGN1cnJlbnQgdXJsIHRvIGxvY2FsaXplZCBvbmVcbiAgICovXG4gIHRyYW5zZm9ybShxdWVyeTogc3RyaW5nIHwgYW55W10pOiBzdHJpbmcgfCBhbnlbXSB7XG4gICAgaWYgKCFxdWVyeSB8fCBxdWVyeS5sZW5ndGggPT09IDAgfHwgIXRoaXMubG9jYWxpemUucGFyc2VyLmN1cnJlbnRMYW5nKSB7XG4gICAgICByZXR1cm4gcXVlcnk7XG4gICAgfVxuICAgIGlmIChlcXVhbHMocXVlcnksIHRoaXMubGFzdEtleSkgJiYgZXF1YWxzKHRoaXMubGFzdExhbmd1YWdlLCB0aGlzLmxvY2FsaXplLnBhcnNlci5jdXJyZW50TGFuZykpIHtcbiAgICAgIHJldHVybiB0aGlzLnZhbHVlO1xuICAgIH1cbiAgICB0aGlzLmxhc3RLZXkgPSBxdWVyeTtcbiAgICB0aGlzLmxhc3RMYW5ndWFnZSA9IHRoaXMubG9jYWxpemUucGFyc2VyLmN1cnJlbnRMYW5nO1xuXG4gICAgLyoqIHRyYW5zbGF0ZSBrZXkgYW5kIHVwZGF0ZSB2YWx1ZXMgKi9cbiAgICB0aGlzLnZhbHVlID0gdGhpcy5sb2NhbGl6ZS50cmFuc2xhdGVSb3V0ZShxdWVyeSk7XG4gICAgdGhpcy5sYXN0S2V5ID0gcXVlcnk7XG4gICAgLy8gaWYgdmlldyBpcyBhbHJlYWR5IGRlc3Ryb3llZCwgaWdub3JlIGZpcmluZyBjaGFuZ2UgZGV0ZWN0aW9uXG4gICAgaWYgKCg8YW55PiB0aGlzLl9yZWYpLl92aWV3LnN0YXRlICYgVklFV19ERVNUUk9ZRURfU1RBVEUpIHtcbiAgICAgIHJldHVybiB0aGlzLnZhbHVlO1xuICAgIH1cbiAgICB0aGlzLl9yZWYuZGV0ZWN0Q2hhbmdlcygpO1xuICAgIHJldHVybiB0aGlzLnZhbHVlO1xuICB9XG59XG4iLCJpbXBvcnQgeyBST1VURVMgfSBmcm9tICdAYW5ndWxhci9yb3V0ZXInO1xuaW1wb3J0IHtcbiAgU3lzdGVtSnNOZ01vZHVsZUxvYWRlciwgTmdNb2R1bGVGYWN0b3J5LCBJbmplY3RvcixcbiAgU3lzdGVtSnNOZ01vZHVsZUxvYWRlckNvbmZpZywgT3B0aW9uYWwsIENvbXBpbGVyLCBJbmplY3RhYmxlLCBJbmplY3QsIGZvcndhcmRSZWZcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBMb2NhbGl6ZVBhcnNlciB9IGZyb20gJy4vbG9jYWxpemUtcm91dGVyLnBhcnNlcic7XG5cbi8qKlxuICogRXh0ZW5zaW9uIG9mIFN5c3RlbUpzTmdNb2R1bGVMb2FkZXIgdG8gZW5hYmxlIGxvY2FsaXphdGlvbiBvZiByb3V0ZSBvbiBsYXp5IGxvYWRcbiAqL1xuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIExvY2FsaXplUm91dGVyQ29uZmlnTG9hZGVyIGV4dGVuZHMgU3lzdGVtSnNOZ01vZHVsZUxvYWRlciB7XG5cbiAgY29uc3RydWN0b3IoQEluamVjdChmb3J3YXJkUmVmKCgpID0+IExvY2FsaXplUGFyc2VyKSkgcHJpdmF0ZSBsb2NhbGl6ZTogTG9jYWxpemVQYXJzZXIsXG4gICAgX2NvbXBpbGVyOiBDb21waWxlciwgQE9wdGlvbmFsKCkgY29uZmlnPzogU3lzdGVtSnNOZ01vZHVsZUxvYWRlckNvbmZpZykge1xuICAgICAgc3VwZXIoX2NvbXBpbGVyLCBjb25maWcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4dGVuZCBsb2FkIHdpdGggY3VzdG9tIGZ1bmN0aW9uYWxpdHlcbiAgICovXG4gIGxvYWQocGF0aDogc3RyaW5nKTogUHJvbWlzZTxOZ01vZHVsZUZhY3Rvcnk8YW55Pj4ge1xuICAgIHJldHVybiBzdXBlci5sb2FkKHBhdGgpLnRoZW4oKGZhY3Rvcnk6IE5nTW9kdWxlRmFjdG9yeTxhbnk+KSA9PiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBtb2R1bGVUeXBlOiBmYWN0b3J5Lm1vZHVsZVR5cGUsXG4gICAgICAgIGNyZWF0ZTogKHBhcmVudEluamVjdG9yOiBJbmplY3RvcikgPT4ge1xuICAgICAgICAgIGNvbnN0IG1vZHVsZSA9IGZhY3RvcnkuY3JlYXRlKHBhcmVudEluamVjdG9yKTtcbiAgICAgICAgICBjb25zdCBnZXRNZXRob2QgPSBtb2R1bGUuaW5qZWN0b3IuZ2V0LmJpbmQobW9kdWxlLmluamVjdG9yKTtcblxuICAgICAgICAgIG1vZHVsZS5pbmplY3RvclsnZ2V0J10gPSAodG9rZW46IGFueSwgbm90Rm91bmRWYWx1ZTogYW55KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBnZXRSZXN1bHQgPSBnZXRNZXRob2QodG9rZW4sIG5vdEZvdW5kVmFsdWUpO1xuXG4gICAgICAgICAgICBpZiAodG9rZW4gPT09IFJPVVRFUykge1xuICAgICAgICAgICAgICAvLyB0cmFuc2xhdGUgbGF6eSByb3V0ZXNcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxpemUuaW5pdENoaWxkUm91dGVzKFtdLmNvbmNhdCguLi5nZXRSZXN1bHQpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBnZXRSZXN1bHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgICByZXR1cm4gbW9kdWxlO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG59XG4iLCJpbXBvcnQge1xuICBOZ01vZHVsZSwgTW9kdWxlV2l0aFByb3ZpZGVycywgQVBQX0lOSVRJQUxJWkVSLCBPcHRpb25hbCwgU2tpcFNlbGYsXG4gIEluamVjdGFibGUsIEluamVjdG9yLCBOZ01vZHVsZUZhY3RvcnlMb2FkZXJcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBMb2NhbGl6ZVJvdXRlclNlcnZpY2UgfSBmcm9tICcuL2xvY2FsaXplLXJvdXRlci5zZXJ2aWNlJztcbmltcG9ydCB7IER1bW15TG9jYWxpemVQYXJzZXIsIExvY2FsaXplUGFyc2VyIH0gZnJvbSAnLi9sb2NhbGl6ZS1yb3V0ZXIucGFyc2VyJztcbmltcG9ydCB7IFJvdXRlck1vZHVsZSwgUm91dGVzIH0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcbmltcG9ydCB7IExvY2FsaXplUm91dGVyUGlwZSB9IGZyb20gJy4vbG9jYWxpemUtcm91dGVyLnBpcGUnO1xuaW1wb3J0IHsgVHJhbnNsYXRlTW9kdWxlIH0gZnJvbSAnQG5neC10cmFuc2xhdGUvY29yZSc7XG5pbXBvcnQgeyBDb21tb25Nb2R1bGUgfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtcbiAgQUxXQVlTX1NFVF9QUkVGSVgsXG4gIENBQ0hFX01FQ0hBTklTTSwgQ0FDSEVfTkFNRSwgREVGQVVMVF9MQU5HX0ZVTkNUSU9OLCBMT0NBTElaRV9ST1VURVJfRk9SUk9PVF9HVUFSRCwgTG9jYWxpemVSb3V0ZXJDb25maWcsIExvY2FsaXplUm91dGVyU2V0dGluZ3MsXG4gIFJBV19ST1VURVMsXG4gIFVTRV9DQUNIRURfTEFOR1xufSBmcm9tICcuL2xvY2FsaXplLXJvdXRlci5jb25maWcnO1xuaW1wb3J0IHsgTG9jYWxpemVSb3V0ZXJDb25maWdMb2FkZXIgfSBmcm9tICcuL2xvY2FsaXplLXJvdXRlci1jb25maWctbG9hZGVyJztcblxuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIFBhcnNlckluaXRpYWxpemVyIHtcbiAgcGFyc2VyOiBMb2NhbGl6ZVBhcnNlcjtcbiAgcm91dGVzOiBSb3V0ZXM7XG5cbiAgLyoqXG4gICAqIENUT1JcbiAgICovXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgaW5qZWN0b3I6IEluamVjdG9yKSB7XG4gIH1cblxuICBhcHBJbml0aWFsaXplcigpOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IHJlcyA9IHRoaXMucGFyc2VyLmxvYWQodGhpcy5yb3V0ZXMpO1xuICAgIHJlcy50aGVuKCgpID0+IHtcbiAgICAgIGNvbnN0IGxvY2FsaXplOiBMb2NhbGl6ZVJvdXRlclNlcnZpY2UgPSB0aGlzLmluamVjdG9yLmdldChMb2NhbGl6ZVJvdXRlclNlcnZpY2UpO1xuICAgICAgbG9jYWxpemUuaW5pdCgpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIGdlbmVyYXRlSW5pdGlhbGl6ZXIocGFyc2VyOiBMb2NhbGl6ZVBhcnNlciwgcm91dGVzOiBSb3V0ZXNbXSk6ICgpID0+IFByb21pc2U8YW55PiB7XG4gICAgdGhpcy5wYXJzZXIgPSBwYXJzZXI7XG4gICAgdGhpcy5yb3V0ZXMgPSByb3V0ZXMucmVkdWNlKChhLCBiKSA9PiBhLmNvbmNhdChiKSk7XG4gICAgcmV0dXJuIHRoaXMuYXBwSW5pdGlhbGl6ZXI7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFwcEluaXRpYWxpemVyKHA6IFBhcnNlckluaXRpYWxpemVyLCBwYXJzZXI6IExvY2FsaXplUGFyc2VyLCByb3V0ZXM6IFJvdXRlc1tdKTogYW55IHtcbiAgcmV0dXJuIHAuZ2VuZXJhdGVJbml0aWFsaXplcihwYXJzZXIsIHJvdXRlcykuYmluZChwKTtcbn1cblxuQE5nTW9kdWxlKHtcbiAgaW1wb3J0czogW0NvbW1vbk1vZHVsZSwgUm91dGVyTW9kdWxlLCBUcmFuc2xhdGVNb2R1bGVdLFxuICBkZWNsYXJhdGlvbnM6IFtMb2NhbGl6ZVJvdXRlclBpcGVdLFxuICBleHBvcnRzOiBbTG9jYWxpemVSb3V0ZXJQaXBlXVxufSlcbmV4cG9ydCBjbGFzcyBMb2NhbGl6ZVJvdXRlck1vZHVsZSB7XG5cbiAgc3RhdGljIGZvclJvb3Qocm91dGVzOiBSb3V0ZXMsIGNvbmZpZzogTG9jYWxpemVSb3V0ZXJDb25maWcgPSB7fSk6IE1vZHVsZVdpdGhQcm92aWRlcnMge1xuICAgIHJldHVybiB7XG4gICAgICBuZ01vZHVsZTogTG9jYWxpemVSb3V0ZXJNb2R1bGUsXG4gICAgICBwcm92aWRlcnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHByb3ZpZGU6IExPQ0FMSVpFX1JPVVRFUl9GT1JST09UX0dVQVJELFxuICAgICAgICAgIHVzZUZhY3Rvcnk6IHByb3ZpZGVGb3JSb290R3VhcmQsXG4gICAgICAgICAgZGVwczogW1tMb2NhbGl6ZVJvdXRlck1vZHVsZSwgbmV3IE9wdGlvbmFsKCksIG5ldyBTa2lwU2VsZigpXV1cbiAgICAgICAgfSxcbiAgICAgICAgeyBwcm92aWRlOiBVU0VfQ0FDSEVEX0xBTkcsIHVzZVZhbHVlOiBjb25maWcudXNlQ2FjaGVkTGFuZyB9LFxuICAgICAgICB7IHByb3ZpZGU6IEFMV0FZU19TRVRfUFJFRklYLCB1c2VWYWx1ZTogY29uZmlnLmFsd2F5c1NldFByZWZpeCB9LFxuICAgICAgICB7IHByb3ZpZGU6IENBQ0hFX05BTUUsIHVzZVZhbHVlOiBjb25maWcuY2FjaGVOYW1lIH0sXG4gICAgICAgIHsgcHJvdmlkZTogQ0FDSEVfTUVDSEFOSVNNLCB1c2VWYWx1ZTogY29uZmlnLmNhY2hlTWVjaGFuaXNtIH0sXG4gICAgICAgIHsgcHJvdmlkZTogREVGQVVMVF9MQU5HX0ZVTkNUSU9OLCB1c2VWYWx1ZTogY29uZmlnLmRlZmF1bHRMYW5nRnVuY3Rpb24gfSxcbiAgICAgICAgTG9jYWxpemVSb3V0ZXJTZXR0aW5ncyxcbiAgICAgICAgY29uZmlnLnBhcnNlciB8fCB7IHByb3ZpZGU6IExvY2FsaXplUGFyc2VyLCB1c2VDbGFzczogRHVtbXlMb2NhbGl6ZVBhcnNlciB9LFxuICAgICAgICB7XG4gICAgICAgICAgcHJvdmlkZTogUkFXX1JPVVRFUyxcbiAgICAgICAgICBtdWx0aTogdHJ1ZSxcbiAgICAgICAgICB1c2VWYWx1ZTogcm91dGVzXG4gICAgICAgIH0sXG4gICAgICAgIExvY2FsaXplUm91dGVyU2VydmljZSxcbiAgICAgICAgUGFyc2VySW5pdGlhbGl6ZXIsXG4gICAgICAgIHsgcHJvdmlkZTogTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCB1c2VDbGFzczogTG9jYWxpemVSb3V0ZXJDb25maWdMb2FkZXIgfSxcbiAgICAgICAge1xuICAgICAgICAgIHByb3ZpZGU6IEFQUF9JTklUSUFMSVpFUixcbiAgICAgICAgICBtdWx0aTogdHJ1ZSxcbiAgICAgICAgICB1c2VGYWN0b3J5OiBnZXRBcHBJbml0aWFsaXplcixcbiAgICAgICAgICBkZXBzOiBbUGFyc2VySW5pdGlhbGl6ZXIsIExvY2FsaXplUGFyc2VyLCBSQVdfUk9VVEVTXVxuICAgICAgICB9XG4gICAgICBdXG4gICAgfTtcbiAgfVxuXG4gIHN0YXRpYyBmb3JDaGlsZChyb3V0ZXM6IFJvdXRlcyk6IE1vZHVsZVdpdGhQcm92aWRlcnMge1xuICAgIHJldHVybiB7XG4gICAgICBuZ01vZHVsZTogTG9jYWxpemVSb3V0ZXJNb2R1bGUsXG4gICAgICBwcm92aWRlcnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHByb3ZpZGU6IFJBV19ST1VURVMsXG4gICAgICAgICAgbXVsdGk6IHRydWUsXG4gICAgICAgICAgdXNlVmFsdWU6IHJvdXRlc1xuICAgICAgICB9XG4gICAgICBdXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJvdmlkZUZvclJvb3RHdWFyZChsb2NhbGl6ZVJvdXRlck1vZHVsZTogTG9jYWxpemVSb3V0ZXJNb2R1bGUpOiBzdHJpbmcge1xuICBpZiAobG9jYWxpemVSb3V0ZXJNb2R1bGUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgTG9jYWxpemVSb3V0ZXJNb2R1bGUuZm9yUm9vdCgpIGNhbGxlZCB0d2ljZS4gTGF6eSBsb2FkZWQgbW9kdWxlcyBzaG91bGQgdXNlIExvY2FsaXplUm91dGVyTW9kdWxlLmZvckNoaWxkKCkgaW5zdGVhZC5gKTtcbiAgfVxuICByZXR1cm4gJ2d1YXJkZWQnO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUE7Ozs7QUFPQSxNQUFhLDZCQUE2QixHQUFHLElBQUksY0FBYyxDQUF1QiwrQkFBK0IsQ0FBQzs7Ozs7QUFLdEgsTUFBYSxVQUFVLEdBQTZCLElBQUksY0FBYyxDQUFXLFlBQVksQ0FBQzs7Ozs7OztBQVU5RixJQUFpQixjQUFjLENBRzlCOzs7O0FBSEQsV0FBaUIsY0FBYztJQUNoQiwyQkFBWSxHQUFtQixjQUFjO0lBQzdDLHFCQUFNLEdBQW1CLFFBQVE7Q0FDL0MsRUFIZ0IsY0FBYyxLQUFkLGNBQWMsUUFHOUI7Ozs7O0FBS0QsTUFBYSxlQUFlLEdBQUcsSUFBSSxjQUFjLENBQVUsaUJBQWlCLENBQUM7Ozs7O0FBSTdFLE1BQWEsZUFBZSxHQUFHLElBQUksY0FBYyxDQUFpQixpQkFBaUIsQ0FBQzs7Ozs7QUFJcEYsTUFBYSxVQUFVLEdBQUcsSUFBSSxjQUFjLENBQVMsWUFBWSxDQUFDOzs7OztBQVdsRSxNQUFhLHFCQUFxQixHQUFHLElBQUksY0FBYyxDQUEwQix1QkFBdUIsQ0FBQzs7Ozs7QUFLekcsTUFBYSxpQkFBaUIsR0FBRyxJQUFJLGNBQWMsQ0FBVSxtQkFBbUIsQ0FBQzs7TUFjM0UsbUJBQW1CLEdBQUcsMkJBQTJCO0FBRXZEOzs7Ozs7Ozs7SUFJRSxZQUNrQyxnQkFBeUIsSUFBSSxFQUMzQixrQkFBMkIsSUFBSSxFQUNqQyxpQkFBaUMsY0FBYyxDQUFDLFlBQVksRUFDakUsWUFBb0IsbUJBQW1CLEVBQzVCLHNCQUErQyxLQUFLLENBQUM7UUFKM0Qsa0JBQWEsR0FBYixhQUFhLENB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