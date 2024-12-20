from gensim import corpora, models
from nltk.corpus import stopwords
import pandas as pd
import ast
import re

class ModelUtils:
    def __init__(self):
        self.lda_model = None
        self.dictionary = None
        self.model_loaded = False
        self.stop_words = set(stopwords.words('english'))
        self.custom_stopwords = self.stop_words.union({
            "wings", "cheese", "shrimp", "burger", "mexican", "pizza", "tacos", "sushi", "sandwich", "chicken", "rice",
            "fries", "salad", "sauce", "meat", "fish", "soup", "fried", "steak", "flavor", "taco", "chips", "orders",
            "table", "side", "order", "burgers",
            "one", "time", "place", "even", "bad", "little", "long", "menu", "restaurant", "food", "prices", "back", "ordered",
            "try", "come", "always", "google", "translated", "original", "like", "get", "dont", "ive", "go", "would", "de",
            "la", "el", "los", "muy", "also", "got", "give", "im", "mexcian", "chinese", "great", "nice", "love", "amazing",
            "definitely", "eat", "make", "made", "better", "much", "first", "hot", "didnt", "never", "know",
            "good", "really", "pretty", "small", "bit", "though", "best", "execellent", "ever", "ok", "everything", "awesome",
            "well", "us", "came", "went", "want", "subway", "years", "super", "new", "spot", "people", "going", "lot", "say",
            "fantastic", "loved", "breakfast", "highly", "options", "need", "favorite", "take", "way", "still", "excellent",
            "location", "fast", "coming", "every", "could", "two", "right", "day", "home", "special", "coffee", "style",
            "sure", "around", "times", "many", "something", "inside", "area", "town", "big", "work", "busy", "cant", "open",
            "perfect", "large", "selection", "stop", "comida", "es", "lugar", "un", "en"
        })

    def load_model_and_data(self):
        print('\033[34m' + 'Model is Loading' + '\033[0m')
        reviews_df = pd.read_csv('./data/real_reviews.csv')
        reviews_df['processed_text'] = reviews_df['processed_text'].apply(self.ensure_list_format)
        self.lda_model, self.dictionary, _ = self.load_lda_model(reviews_df['processed_text'])
        self.model_loaded = True
        print('\033[34m' + 'Model is Loaded' + '\033[0m')

    def ensure_list_format(self, text):
        if isinstance(text, str):
            try:
                return ast.literal_eval(text)
            except ValueError:
                return text.split()
        return text

    def load_lda_model(self, texts, dir='./models'):
        lda_model = models.LdaModel.load(dir+'/real_lda_model.model')
        dictionary = corpora.Dictionary.load(dir+'/real_dictionary.dict')
        corpus = corpora.MmCorpus(dir+"/real_corpus.mm")
        return lda_model, dictionary, corpus

    def preprocess_text(self, text):
        text = re.sub(r'[^a-zA-Z\s]', '', text)
        text = text.lower()
        return [word for word in text.split() if word not in self.custom_stopwords]

    def calculate_input_topic_weights(self, user_input):
        tokens = self.preprocess_text(user_input)
        bow = self.dictionary.doc2bow(tokens)
        topic_weights = self.lda_model.get_document_topics(bow, minimum_probability=0.0)
        return [float(weight) for topic_id, weight in topic_weights]