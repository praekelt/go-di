di.quiz.answerwin = function() {
    var QuizStates = di.quiz.QuizStates;
    var vumigo = require('vumigo_v02');
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var MenuState = vumigo.states.MenuState;
    var FreeText = vumigo.states.FreeText;
    var utils = vumigo.utils;

    var AnswerWinQuiz = QuizStates.extend(function(self,app) {
        QuizStates.call(self,app,{
            name:'answerwin'
        });

        var $ = app.$;

        self.next_quiz = function(n,content,next) {
            return self
                .answer(n,content.value)
                .then(function() {
                    return self.set_quiz_completion();
                })
                .then(function() {
                    return self.incr_quiz_metrics();
                })
                .then(function() {
                    return self.construct_state_name(next);
                });
        };

        self.format_msisdn = function(content) {
            if (content[0] === '0') {
                content = "+27"+content.slice(1);
            }
            return utils.format_addr.msisdn(content);
        };

        self.save_msisdn = function(content,next) {
            app.contact.msisdn = self.format_msisdn(content);
            app.contact.extra.answerwin_completion_time = app.get_date_string();

            return app.im.contacts
                .save(app.contact)
                .then(function() {
                    return self.incr_quiz_metrics();
                })
                .then(function() {
                    return self.construct_state_name(next);
                });
        };

        app.states.add("states:quiz:answerwin:begin",function(name) {
            if (!self.is_complete()) {
                return app.states.create(self.construct_state_name('gender'));
            } else {
                return app.states.create('states:quiz:end');
            }
        });

        self.add_question('gender',function(name) {
            return new ChoiceState(name, {
                question: $('I am...'),
                choices: [
                    new Choice('male',$('Male')),
                    new Choice('female',$('Female')),
                ],
                next: function(choice) {
                    return self.next_quiz('gender',choice,'age');
                }
            });
        });

        self.add_question('age',function(name) {
            return new ChoiceState(name, {
                question: $('How old are you?'),
                choices: [
                    new Choice('u14',$('u14')),
                    new Choice('15-19',$('15-19')),
                    new Choice('20-29',$('20-29')),
                    new Choice('30-39',$('30-39')),
                    new Choice('40-49',$('40-49')),
                    new Choice('50+',$('50+'))
                ],
                next: function(choice) {
                    return self.next_quiz('age',choice,'2009election');
                }
            });
        });

        self.add_question('2009election',function(name) {
            return new ChoiceState(name, {
                question: $('Did you vote in the 2009 election?'),
                choices: [
                    new Choice('yes',$('Yes')),
                    new Choice('no_not_registered',$('No, could not/was not registered')),
                    new Choice('no_didnt_want_to',$('No, did not want to')),
                    new Choice('no_other',$('No, other')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(choice) {
                    return self.next_quiz('2009election',choice,'race');
                }
            });
        });

        self.add_question('race',function(name) {
            return new ChoiceState(name, {
                question: $('I am...'),
                choices: [
                    new Choice('black_african',$('Black African')),
                    new Choice('coloured',$('Coloured')),
                    new Choice('indian_or_asian',$('Indian/Asian')),
                    new Choice('white',$('White')),
                    new Choice('other',$('Other')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(choice) {
                    return self.next_quiz('race',choice,'check_deliveryclass');
                }
            });
        });

        app.states.add(self.construct_state_name('check_deliveryclass'),function(name) {
            if (app.is_delivery_class('ussd')) {
                return app.states.create(self.construct_state_name('thankyou'));
            } else {
                return app.states.create(self.construct_state_name('phonenumber'));
            }
        });

        app.states.add(self.construct_state_name('thankyou'),function(name) {
            return new MenuState(name, {
                question: $('Thank you for telling VIP a bit more about yourself! Your airtime will be sent to you shortly!'),
                choices: [
                    new Choice('states:menu',$('Main Menu'))
                ]
            });
        });

        self.init = function() {
            if (!app.is_delivery_class('ussd')) {
                self.add_question('phonenumber',function(name) {
                    return new FreeText(name, {
                        question: $('Please give us your cellphone number so we can send you your airtime!'),
                        next: function(content) {
                            //save msisdn + set quiz completion to true.
                            return self
                                .save_msisdn(content)
                                .thenResolve(self.construct_state_name('thankyou'));
                        }
                    });
                });
            }
        };

    });
    return {
        AnswerWinQuiz: AnswerWinQuiz
    };
}();