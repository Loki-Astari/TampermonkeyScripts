/*
PageInfo:
    string:         url
    string:         display
    string:         noteUrl
    vector<string>  labels
    vector<string>  linkedPages

DataImpl:
    integer:                    version
    map<string, PageIngo>       pages
    map<string, vector<string>> labels
    vector<string>              notes

Data:
    data:       DataImpl


*/

class DataImpl {
    #version;
    #pages;
    #labels;
    #notes;


    constructor(input) {
        var rawData = input;
        if (typeof rawData === 'string') {
            rawData = JSON.parse(input);
        }
        rawData = Converter.convert(rawData);

        this.#version   = rawData.version;
        this.#pages     = {};
        Object.entries(rawData.pages).forEach(entry => {
            const [key, value] = entry;
            this.#pages[key] = PageInfo.buildPageInfoFromObject(value);
        });
        this.#labels    = rawData.labels;
        this.#notes     = rawData.notes;
    }
    #getOrInsertPage(page)      {if (this.#pages[page] === undefined) {this.#pages[page] = PageInfo.buildPageInfoFromValue(page);} return this.#pages[page];}

    getPage(page)               {return this.#pages[page] !== undefined ? this.#pages[page] : PageInfo.buildPageInfoFromObject({url:page});}
    getLabel(label)             {return this.#labels[label] !== undefined ? this.#labels[label].values() : [].entries();}

    get version()               {return this.#version;}
    get labels()                {return Object.keys(this.#labels).values();}
    get notes()                 {return this.#notes.values();}

    toJSON() {
        const p = this.#pages;
        return {
            version: this.#version,
            pages: Object.keys(p).filter(key => !p[key].empty).reduce( (res, key) => (res[key] = p[key], res), {}),
            labels: this.#labels,
            notes: this.#notes
        };
    }

    setDisplay(page, display)   {
        const oldPage = this.#pages[page];
        if (!oldPage) {
            return;
        }
        this.#pages[page] = PageInfo.buildDuplicateWithReplace(oldPage, {display: display});
    }
    setNote(page, note) {
        const oldPage = this.#getOrInsertPage(page);
        const oldNote = oldPage.noteUrl;
        if (note == oldNote) {
            return;
        }

        this.#pages[page] = PageInfo.buildDuplicateWithReplace(oldPage, {noteUrl: note});

        if ( oldNote != '') {
            const oldNotePage = this.#pages[oldNote];
            const linkedPages = Array.from(Util.filter(oldNotePage.linkedPages, (obj) => obj != page));
            this.#pages[oldNote] = PageInfo.buildDuplicateWithReplace(oldNotePage, {linkedPages: linkedPages});
        }

        if (note != '') {
            if (!(note in this.#pages)) {
                this.#pages[note] = PageInfo.buildPageInfoFromObject({url: note, linkedPages: [page]});
            }
            else {
                const newNotePage = this.#pages[note];
                const linkedPages = Array.from(newNotePage.linkedPages);
                linkedPages.push(page);
                this.#pages[note] = PageInfo.buildDuplicateWithReplace(newNotePage, {linkedPages: linkedPages});
            }
        }
    }
    addLabel(page, label) {
        if (!label) {
            return;
        }
        const oldPage = this.#getOrInsertPage(page);
        const labels = [];
        for (const obj of oldPage.labels) {
            if (obj == label) {
                return;
            }
            labels.push(obj);
        }
        labels.push(label);

        this.#pages[page] = PageInfo.buildDuplicateWithReplace(oldPage, {labels: labels});
        if (this.#labels[label] === undefined) {
            this.#labels[label] = [];
        }
        this.#labels[label].push(page);
    }
    remLabel(page, label) {
        if (!label) {
            return;
        }
        const oldPage = this.#pages[page];
        if (!oldPage) {
            return;
        }
        const labels = [];
        var found = false;
        for (const obj of oldPage.labels) {
            if (obj == label) {
                found = true;
                continue;
            }
            labels.push(obj);
        }
        if (!found) {
            return;
        }
        this.#pages[page] = PageInfo.buildDuplicateWithReplace(oldPage, {labels: labels});
        this.#labels[label] = this.#labels[label].filter((obj) => obj != page);
    }
    deleteNote(note) {
        const notePage = this.#pages[note];
        if (!notePage) {
            return;
        }
        if (notePage.linkedPagesLength == 0) {
            return;
        }
        for (const linkedPage of notePage.linkedPages) {
            const linkedPageData = this.#pages[linkedPage];

            this.#pages[linkedPage] = PageInfo.buildDuplicateWithReplace(linkedPageData, {noteUrl: ''});
        }
        this.#pages[note] = PageInfo.buildDuplicateWithReplace(notePage, {linkedPages: []});
        this.#notes = this.#notes.filter((obj) => obj != note);
    }
    deleteLabel(label) {
        const labels = this.#labels[label];
        if (!labels) {
            return;
        }
        for (const page of labels.values()) {
            const linkedPageData = this.#pages[page];
            const linkedPageLabels = Array.from(Util.filter(linkedPageData.labels, (obj) => obj != label));
            this.#pages[page] =  PageInfo.buildDuplicateWithReplace(linkedPageData, {labels: linkedPageLabels});
        }

        delete this.#labels[label];
    }
}

class Data {
    #data;

    constructor(input) {
        this.#data = new DataImpl(input);
    }
    stringify() {
        return JSON.stringify(this.#data);
    }

    getPage(page)               {return this.#data.getPage(page);}
    getLabel(label)             {return this.#data.getLabel(label);}

    get version()               {return this.#data.version;}
    get labels()                {return this.#data.labels;}
    get notes()                 {return this.#data.notes;}

    toJSON()                    {return this.#data.toJSON();}

    setDisplay(page, display)   {this.#data.setDisplay(page, display);}
    setNote(page, note)         {this.#data.setNote(page, note);}
    addLabel(page, label)       {this.#data.addLabel(page, label);}
    remLabel(page, label)       {this.#data.remLabel(page, label);}

    deleteNote(note)            {this.#data.deleteNote(note);}
    deleteLabel(label)          {this.#data.deleteLabel(label);}
};

if (typeof process !== 'undefined' && process.env['NODE_DEV'] == 'TEST') {
    module.exports = Data;
}
