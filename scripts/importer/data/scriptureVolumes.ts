// Scripture volume configurations for all standard works

export interface BookConfig {
  id: string;
  name: string;
  fullName: string;
  chapters: number;
  category: string;
}

export interface VolumeConfig {
  id: string;
  name: string;
  fullName: string;
  abbreviation: string;
  apiPath: string;
  translation: string;
  copyright: string;
  books: BookConfig[];
}

// Book of Mormon
export const BOOK_OF_MORMON: VolumeConfig = {
  id: 'bofm',
  name: 'The Book of Mormon',
  fullName: 'The Book of Mormon: Another Testament of Jesus Christ',
  abbreviation: 'BoM',
  apiPath: 'bofm',
  translation: 'bofm',
  copyright: '© Intellectual Reserve, Inc.',
  books: [
    { id: '1-ne', name: '1 Nephi', fullName: 'First Nephi', chapters: 22, category: 'bom-book' },
    { id: '2-ne', name: '2 Nephi', fullName: 'Second Nephi', chapters: 33, category: 'bom-book' },
    { id: 'jacob', name: 'Jacob', fullName: 'The Book of Jacob', chapters: 7, category: 'bom-book' },
    { id: 'enos', name: 'Enos', fullName: 'The Book of Enos', chapters: 1, category: 'bom-book' },
    { id: 'jarom', name: 'Jarom', fullName: 'The Book of Jarom', chapters: 1, category: 'bom-book' },
    { id: 'omni', name: 'Omni', fullName: 'The Book of Omni', chapters: 1, category: 'bom-book' },
    { id: 'w-of-m', name: 'Words of Mormon', fullName: 'The Words of Mormon', chapters: 1, category: 'bom-book' },
    { id: 'mosiah', name: 'Mosiah', fullName: 'The Book of Mosiah', chapters: 29, category: 'bom-book' },
    { id: 'alma', name: 'Alma', fullName: 'The Book of Alma', chapters: 63, category: 'bom-book' },
    { id: 'hel', name: 'Helaman', fullName: 'The Book of Helaman', chapters: 16, category: 'bom-book' },
    { id: '3-ne', name: '3 Nephi', fullName: 'Third Nephi', chapters: 30, category: 'bom-book' },
    { id: '4-ne', name: '4 Nephi', fullName: 'Fourth Nephi', chapters: 1, category: 'bom-book' },
    { id: 'morm', name: 'Mormon', fullName: 'The Book of Mormon', chapters: 9, category: 'bom-book' },
    { id: 'ether', name: 'Ether', fullName: 'The Book of Ether', chapters: 15, category: 'bom-book' },
    { id: 'moro', name: 'Moroni', fullName: 'The Book of Moroni', chapters: 10, category: 'bom-book' },
  ],
};

// Old Testament
export const OLD_TESTAMENT: VolumeConfig = {
  id: 'ot',
  name: 'The Old Testament',
  fullName: 'The Old Testament',
  abbreviation: 'OT',
  apiPath: 'ot',
  translation: 'kjv',
  copyright: 'Public Domain',
  books: [
    // Law / Pentateuch
    { id: 'gen', name: 'Genesis', fullName: 'The First Book of Moses, called Genesis', chapters: 50, category: 'law' },
    { id: 'ex', name: 'Exodus', fullName: 'The Second Book of Moses, called Exodus', chapters: 40, category: 'law' },
    { id: 'lev', name: 'Leviticus', fullName: 'The Third Book of Moses, called Leviticus', chapters: 27, category: 'law' },
    { id: 'num', name: 'Numbers', fullName: 'The Fourth Book of Moses, called Numbers', chapters: 36, category: 'law' },
    { id: 'deut', name: 'Deuteronomy', fullName: 'The Fifth Book of Moses, called Deuteronomy', chapters: 34, category: 'law' },
    
    // History
    { id: 'josh', name: 'Joshua', fullName: 'The Book of Joshua', chapters: 24, category: 'history' },
    { id: 'judg', name: 'Judges', fullName: 'The Book of Judges', chapters: 21, category: 'history' },
    { id: 'ruth', name: 'Ruth', fullName: 'The Book of Ruth', chapters: 4, category: 'history' },
    { id: '1-sam', name: '1 Samuel', fullName: 'The First Book of Samuel', chapters: 31, category: 'history' },
    { id: '2-sam', name: '2 Samuel', fullName: 'The Second Book of Samuel', chapters: 24, category: 'history' },
    { id: '1-kgs', name: '1 Kings', fullName: 'The First Book of Kings', chapters: 22, category: 'history' },
    { id: '2-kgs', name: '2 Kings', fullName: 'The Second Book of Kings', chapters: 25, category: 'history' },
    { id: '1-chr', name: '1 Chronicles', fullName: 'The First Book of Chronicles', chapters: 29, category: 'history' },
    { id: '2-chr', name: '2 Chronicles', fullName: 'The Second Book of Chronicles', chapters: 36, category: 'history' },
    { id: 'ezra', name: 'Ezra', fullName: 'The Book of Ezra', chapters: 10, category: 'history' },
    { id: 'neh', name: 'Nehemiah', fullName: 'The Book of Nehemiah', chapters: 13, category: 'history' },
    { id: 'esth', name: 'Esther', fullName: 'The Book of Esther', chapters: 10, category: 'history' },
    
    // Wisdom
    { id: 'job', name: 'Job', fullName: 'The Book of Job', chapters: 42, category: 'wisdom' },
    { id: 'ps', name: 'Psalms', fullName: 'The Book of Psalms', chapters: 150, category: 'wisdom' },
    { id: 'prov', name: 'Proverbs', fullName: 'The Proverbs', chapters: 31, category: 'wisdom' },
    { id: 'eccl', name: 'Ecclesiastes', fullName: 'Ecclesiastes', chapters: 12, category: 'wisdom' },
    { id: 'song', name: 'Song of Solomon', fullName: 'The Song of Solomon', chapters: 8, category: 'wisdom' },
    
    // Major Prophets
    { id: 'isa', name: 'Isaiah', fullName: 'The Book of Isaiah', chapters: 66, category: 'prophets-major' },
    { id: 'jer', name: 'Jeremiah', fullName: 'The Book of Jeremiah', chapters: 52, category: 'prophets-major' },
    { id: 'lam', name: 'Lamentations', fullName: 'The Lamentations of Jeremiah', chapters: 5, category: 'prophets-major' },
    { id: 'ezek', name: 'Ezekiel', fullName: 'The Book of Ezekiel', chapters: 48, category: 'prophets-major' },
    { id: 'dan', name: 'Daniel', fullName: 'The Book of Daniel', chapters: 12, category: 'prophets-major' },
    
    // Minor Prophets
    { id: 'hosea', name: 'Hosea', fullName: 'The Book of Hosea', chapters: 14, category: 'prophets-minor' },
    { id: 'joel', name: 'Joel', fullName: 'The Book of Joel', chapters: 3, category: 'prophets-minor' },
    { id: 'amos', name: 'Amos', fullName: 'The Book of Amos', chapters: 9, category: 'prophets-minor' },
    { id: 'obad', name: 'Obadiah', fullName: 'The Book of Obadiah', chapters: 1, category: 'prophets-minor' },
    { id: 'jonah', name: 'Jonah', fullName: 'The Book of Jonah', chapters: 4, category: 'prophets-minor' },
    { id: 'micah', name: 'Micah', fullName: 'The Book of Micah', chapters: 7, category: 'prophets-minor' },
    { id: 'nahum', name: 'Nahum', fullName: 'The Book of Nahum', chapters: 3, category: 'prophets-minor' },
    { id: 'hab', name: 'Habakkuk', fullName: 'The Book of Habakkuk', chapters: 3, category: 'prophets-minor' },
    { id: 'zeph', name: 'Zephaniah', fullName: 'The Book of Zephaniah', chapters: 3, category: 'prophets-minor' },
    { id: 'hag', name: 'Haggai', fullName: 'The Book of Haggai', chapters: 2, category: 'prophets-minor' },
    { id: 'zech', name: 'Zechariah', fullName: 'The Book of Zechariah', chapters: 14, category: 'prophets-minor' },
    { id: 'mal', name: 'Malachi', fullName: 'The Book of Malachi', chapters: 4, category: 'prophets-minor' },
  ],
};

// New Testament
export const NEW_TESTAMENT: VolumeConfig = {
  id: 'nt',
  name: 'The New Testament',
  fullName: 'The New Testament of Our Lord and Saviour Jesus Christ',
  abbreviation: 'NT',
  apiPath: 'nt',
  translation: 'kjv',
  copyright: 'Public Domain',
  books: [
    // Gospels
    { id: 'matt', name: 'Matthew', fullName: 'The Gospel According to Matthew', chapters: 28, category: 'gospels' },
    { id: 'mark', name: 'Mark', fullName: 'The Gospel According to Mark', chapters: 16, category: 'gospels' },
    { id: 'luke', name: 'Luke', fullName: 'The Gospel According to Luke', chapters: 24, category: 'gospels' },
    { id: 'john', name: 'John', fullName: 'The Gospel According to John', chapters: 21, category: 'gospels' },
    
    // Acts
    { id: 'acts', name: 'Acts', fullName: 'The Acts of the Apostles', chapters: 28, category: 'acts' },
    
    // Paul's Epistles
    { id: 'rom', name: 'Romans', fullName: 'The Epistle of Paul to the Romans', chapters: 16, category: 'epistles-paul' },
    { id: '1-cor', name: '1 Corinthians', fullName: 'The First Epistle of Paul to the Corinthians', chapters: 16, category: 'epistles-paul' },
    { id: '2-cor', name: '2 Corinthians', fullName: 'The Second Epistle of Paul to the Corinthians', chapters: 13, category: 'epistles-paul' },
    { id: 'gal', name: 'Galatians', fullName: 'The Epistle of Paul to the Galatians', chapters: 6, category: 'epistles-paul' },
    { id: 'eph', name: 'Ephesians', fullName: 'The Epistle of Paul to the Ephesians', chapters: 6, category: 'epistles-paul' },
    { id: 'philip', name: 'Philippians', fullName: 'The Epistle of Paul to the Philippians', chapters: 4, category: 'epistles-paul' },
    { id: 'col', name: 'Colossians', fullName: 'The Epistle of Paul to the Colossians', chapters: 4, category: 'epistles-paul' },
    { id: '1-thes', name: '1 Thessalonians', fullName: 'The First Epistle of Paul to the Thessalonians', chapters: 5, category: 'epistles-paul' },
    { id: '2-thes', name: '2 Thessalonians', fullName: 'The Second Epistle of Paul to the Thessalonians', chapters: 3, category: 'epistles-paul' },
    { id: '1-tim', name: '1 Timothy', fullName: 'The First Epistle of Paul to Timothy', chapters: 6, category: 'epistles-paul' },
    { id: '2-tim', name: '2 Timothy', fullName: 'The Second Epistle of Paul to Timothy', chapters: 4, category: 'epistles-paul' },
    { id: 'titus', name: 'Titus', fullName: 'The Epistle of Paul to Titus', chapters: 3, category: 'epistles-paul' },
    { id: 'philem', name: 'Philemon', fullName: 'The Epistle of Paul to Philemon', chapters: 1, category: 'epistles-paul' },
    
    // General Epistles
    { id: 'heb', name: 'Hebrews', fullName: 'The Epistle to the Hebrews', chapters: 13, category: 'epistles-general' },
    { id: 'james', name: 'James', fullName: 'The General Epistle of James', chapters: 5, category: 'epistles-general' },
    { id: '1-pet', name: '1 Peter', fullName: 'The First Epistle General of Peter', chapters: 5, category: 'epistles-general' },
    { id: '2-pet', name: '2 Peter', fullName: 'The Second Epistle General of Peter', chapters: 3, category: 'epistles-general' },
    { id: '1-jn', name: '1 John', fullName: 'The First Epistle General of John', chapters: 5, category: 'epistles-general' },
    { id: '2-jn', name: '2 John', fullName: 'The Second Epistle of John', chapters: 1, category: 'epistles-general' },
    { id: '3-jn', name: '3 John', fullName: 'The Third Epistle of John', chapters: 1, category: 'epistles-general' },
    { id: 'jude', name: 'Jude', fullName: 'The General Epistle of Jude', chapters: 1, category: 'epistles-general' },
    
    // Apocalyptic
    { id: 'rev', name: 'Revelation', fullName: 'The Revelation of John', chapters: 22, category: 'apocalyptic' },
  ],
};

// Doctrine and Covenants
export const DOCTRINE_AND_COVENANTS: VolumeConfig = {
  id: 'dc',
  name: 'Doctrine and Covenants',
  fullName: 'The Doctrine and Covenants of The Church of Jesus Christ of Latter-day Saints',
  abbreviation: 'D&C',
  apiPath: 'dc-testament/dc',
  translation: 'dc',
  copyright: '© Intellectual Reserve, Inc.',
  books: [
    { id: 'dc', name: 'Doctrine and Covenants', fullName: 'The Doctrine and Covenants', chapters: 138, category: 'modern-revelation' },
  ],
};

// Pearl of Great Price
export const PEARL_OF_GREAT_PRICE: VolumeConfig = {
  id: 'pgp',
  name: 'Pearl of Great Price',
  fullName: 'The Pearl of Great Price',
  abbreviation: 'PGP',
  apiPath: 'pgp',
  translation: 'pgp',
  copyright: '© Intellectual Reserve, Inc.',
  books: [
    { id: 'moses', name: 'Moses', fullName: 'The Book of Moses', chapters: 8, category: 'ancient-scripture' },
    { id: 'abr', name: 'Abraham', fullName: 'The Book of Abraham', chapters: 5, category: 'ancient-scripture' },
    { id: 'js-m', name: 'Joseph Smith—Matthew', fullName: 'Joseph Smith—Matthew', chapters: 1, category: 'modern-revelation' },
    { id: 'js-h', name: 'Joseph Smith—History', fullName: 'Joseph Smith—History', chapters: 1, category: 'modern-revelation' },
    { id: 'a-of-f', name: 'Articles of Faith', fullName: 'The Articles of Faith', chapters: 1, category: 'modern-revelation' },
  ],
};

// All volumes
export const ALL_VOLUMES: VolumeConfig[] = [
  BOOK_OF_MORMON,
  OLD_TESTAMENT,
  NEW_TESTAMENT,
  DOCTRINE_AND_COVENANTS,
  PEARL_OF_GREAT_PRICE,
];

