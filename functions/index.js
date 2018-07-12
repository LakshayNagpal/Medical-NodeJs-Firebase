const functions = require('firebase-functions');
const fs = require('fs');
var admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
var firestore = admin.firestore();
var http = require('http');
var uuid = require('uuid/v4');
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

exports.medical = functions.https.onRequest((request,response) => {

  //console.log("request.body.originalDetectIntentRequest", request.body.originalDetectIntentRequest.payload.inputs[0].rawInputs[0].query);

  switch(request.body.queryResult.action){

    case 'diagnosisAction': {
      console.log("diagnosisAction executed");

      var condition = request.body.queryResult.parameters.entity_medical ;
      var output_diag = '';
      console.log("condition in diagnosisAction", condition);

      var fields = firestore.collection('medical').doc(condition);
      fields.get()
      .then(doc => {
        if(!doc.exists){
          console.log("No document found for the condition")
        }else{
          var medical_data = doc.data();
          console.log("medical_data", medical_data);
          output = '';
          trimmed_output = '';
          // for(var mykey in medical_data){
          //   output = output + mykey + `  `;
          //   output = output + medical_data[mykey] + `  \n`
          // }
          var ss;
          for(var mykey in medical_data){
            output = output + `{"optionInfo": {"key":"${mykey}"},"description":"${medical_data[mykey]}","title":"${mykey}" },`;
            output_diag = output_diag + `* ${mykey}  \n`;
          }

          console.log("OUTPOUT", output);
          trimmed_output = output.substring(0,output.length - 1);
          trimmed_output = '[' + trimmed_output + ']'
          trimmed_output = JSON.parse(trimmed_output);
          console.log("TRIMMED OUTPUT", trimmed_output);

          response.send({
            'fulfillmentText': `What would you like to know about ${condition}.  \n${output_diag}`,
            "payload": {
              "google": {
                "expectUserResponse": true,
                "richResponse": {
                  "items": [
                    {
                      "simpleResponse": {
                        "textToSpeech": `What would you like to know about ${condition}.`
                      }
                    }
                  ]
                },
                "systemIntent": {
                  "intent": "actions.intent.OPTION",
                  "data": {
                    "@type": "type.googleapis.com/google.actions.v2.OptionValueSpec",
                    "listSelect": {
                      "title": "Please select one of the following factors",
                      "items": trimmed_output
                    }
                  }
                }
              }
            }

          });

        }
        return console.log("then block executed");
      })
      .catch((e => {
        console.log("error:", e);
      }))

      break;
    }
    case 'factorsAction':{

      console.log("factorsAction executed");
      //var information_key = request.body.queryResult.queryText;
      var information_key = request.body.originalDetectIntentRequest.payload.inputs[0].rawInputs[0].query;

      console.log("information_key",information_key);
      var outcontext = request.body.queryResult.outputContexts;

      var information_value;
      for(var i=0;i<outcontext.length; i++){
        var ele = outcontext[i];
        var contextname = ele.name ;
        var contextname_arr = contextname.split("/");
        var contextfollowup = contextname_arr[contextname_arr.length - 1];
        if(contextfollowup === "diagnosis-context"){
            condition = ele.parameters.entity_medical;
        }
      }

      console.log("condition matched from context", condition);

      fields = firestore.collection('medical').doc(condition);
      fields.get()
      .then(doc => {
        if(!doc.exists){
          console.log("No document found for the condition")
        }else{
          var medical_data = doc.data();
          console.log("medical_data", medical_data);

          for(var mykey in medical_data){
            //output = output + `{"optionInfo": {"key":"${mykey}"},"description":"${medical_data[mykey]}","title":"${mykey}" },`
            if(mykey === information_key){
              information_value = medical_data[mykey];
              break;
            } else {
              information_value = medical_data[mykey];
            }
          }

          console.log("information value extracted from medical_data", information_value);

          if(information_value.length > 639){
            information_value_1 = information_value.substring(0,640);
            information_value_2 = information_value.substring(640,information_value.length);

            console.log("information_value_1", information_value_1);
            console.log("information_value_2", information_value_2);

            response.send({
              'fulfillmentText': information_value,
              "payload": {
                "google": {
                  "expectUserResponse": true,
                  "richResponse": {
                    "items": [
                      {
                        "simpleResponse": {
                          "textToSpeech": information_value_1
                        }
                      },
                      {
                        "simpleResponse": {
                          "textToSpeech": information_value_2
                        }
                      },
                      {
                        "basicCard": {
                          "formattedText": `**Want to know more about ${condition}**`,
                        }
                      }
                    ],
                    "suggestions": [
                      {
                        "title": "yes"
                      },
                      {
                        "title": "no"
                      }
                    ]
                  }
                }
              }
            });

          }else{

            console.log("else block information_value", information_value);
            response.send({
              'fulfillmentText': information_value,
              "payload": {
                "google": {
                  "expectUserResponse": true,
                  "richResponse": {
                    "items": [
                      {
                        "simpleResponse": {
                          "textToSpeech": information_value
                        }
                      },
                      {
                        "basicCard": {
                          "formattedText": `**Want to know more about ${condition}**`,
                        }
                      }
                    ],
                    "suggestions": [
                      {
                        "title": "yes"
                      },
                      {
                        "title": "no"
                      }
                    ]
                  }
                }
              }
            });

          }

        }   //else block of firestore in factorsAction
        return console.log("then block executed");
      })
      .catch((e => {
        console.log("error:", e);
        response.send({
          'fulfillmentText': `I couldn't process your query. Please try again one more time.`
        });
      }))


      break;
    }
    case 'factorsYes': {
      console.log("factorsYes executed");

      outcontext = request.body.queryResult.outputContexts;

      for(i=0;i<outcontext.length; i++){
        ele = outcontext[i];
        contextname = ele.name ;
        contextname_arr = contextname.split("/");
        contextfollowup = contextname_arr[contextname_arr.length - 1];
        if(contextfollowup === "diagnosis-context"){
            condition = ele.parameters.entity_medical;
        }
      }

      fields = firestore.collection('medical').doc(condition);
      fields.get()
      .then(doc => {
        if(!doc.exists){
          console.log("No document found for the condition in factorsYes")
        }else{
          var medical_data = doc.data();
          console.log("medical_data for factorsYes", medical_data);
          output = '';
          trimmed_output = '';

          for(var mykey in medical_data){
            output = output + `{"optionInfo": {"key":"${mykey}"},"description":"${medical_data[mykey]}","title":"${mykey}" },`;
            output_diag = output_diag + `* ${mykey}\n`;
          }

          console.log("OUTPOUT factorsYes", output);
          trimmed_output = output.substring(0,output.length - 1);
          trimmed_output = '[' + trimmed_output + ']'
          trimmed_output = JSON.parse(trimmed_output);
          console.log("TRIMMED OUTPUT factorsYes", trimmed_output);

          response.send({
            'fulfillmentText': `What would you like to know about ${condition}.  \n${output_diag}`,
            "payload": {
              "google": {
                "expectUserResponse": true,
                "richResponse": {
                  "items": [
                    {
                      "simpleResponse": {
                        "textToSpeech": `For which other factors would you like to know about ${condition}.`
                      }
                    }
                  ]
                },
                "systemIntent": {
                  "intent": "actions.intent.OPTION",
                  "data": {
                    "@type": "type.googleapis.com/google.actions.v2.OptionValueSpec",
                    "listSelect": {
                      "title": "Please select one of the following factors",
                      "items": trimmed_output
                    }
                  }
                }
              }
            }

          });

        }
        return console.log("then block executed");
      })
      .catch((e => {
        console.log("error:", e);
      }))

      break;
    }
    default: {
      response.send({
        'fulfillmentText': `No action matched in the webhook`
      })
      break;
    }
  }
});


// exports.oddeven = functions.https.onRequest((request, response) => {
//
//   let userStorage = request.body.originalDetectIntentRequest.payload.user.userStorage || JSON.stringify({});
//   let userId;
//
//   userStorage = JSON.parse(userStorage);
//
//   if (userStorage.hasOwnProperty('userId')) {
//     userId = userStorage.userId;
//     //console.log("userID In if", userId);
//   } else {
//     // Uses the "uuid" package. You can get this with "npm install --save uuid"
//     // var uuid = require('uuid/v4');
//
//     userId = uuid();
//     userStorage.userId = userId
//   }
//
//   console.log("userID", userId);
//
//   if(request.body.queryResult.languageCode === "da"){     // english language else block end
//
//     switch(request.body.queryResult.action) {
//
//       case 'generatenumber' : {
//
//
//         let params = request.body.queryResult.parameters ;
//         let runs = request.body.queryResult.parameters.runs.number ;
//
//         runs = Math.floor(runs);
//         if(runs <= 0 || runs > 6){
//           response.send({
//             'payload': {
//               'google': {
//                 'userStorage': JSON.stringify(userStorage),
//                 "expectUserResponse": true,
//                 "richResponse": {
//                   "items": [
//                     {
//                       "simpleResponse": {
//                         "textToSpeech": `您只能从1次运行到6次运行。`
//                       }
//                     }
//                   ],
//                   "suggestions": [
//                     {
//                       "title": "1"
//                     },
//                     {
//                       "title": "2"
//                     },
//                     {
//                       "title": "3"
//                     },
//                     {
//                       "title": "4"
//                     },
//                     {
//                       "title": "5"
//                     },
//                     {
//                       "title": "6"
//                     }
//                   ]
//                   // "linkOutSuggestion": {
//                   //   "destinationName": "Website",
//                   //   "url": "https://assistant.google.com"
//                   // }
//                 }
//               }
//             }
//
//           })
//         } else {
//
//         ass_run = Math.floor(Math.random() * 6) + 1;
//       //console.log("card outside", card);
//
//         if(ass_run === runs){
//           card = { };
//           fields = firestore.collection('game').doc(userId);
//           fields.get()
//           .then( doc => {
//             if(!doc.exists){
//               console.log('No duch document!');
//               response.send({
//                 'payload': {
//                   'google': {
//                     'userStorage': JSON.stringify(userStorage),
//                     "expectUserResponse": true,
//                     "richResponse": {
//                       "items": [
//                         {
//                           "simpleResponse": {
//                             "textToSpeech": `我们都打了 ${runs} 运行。对不起，你出第一球！`
//                           }
//                         },
//                         {
//                           "simpleResponse": {
//                             "textToSpeech": `不幸的是，你的总分是0分。 \n你想再次竞争吗？`
//                           }
//                         }
//                       ],
//                       "suggestions": [
//                         {
//                           "title": "是"
//                         },
//                         {
//                           "title": "没有"
//                         }
//                       ]
//                       // "linkOutSuggestion": {
//                       //   "destinationName": "Website",
//                       //   "url": "https://assistant.google.com"
//                       // }
//                     }
//                   }
//                 }
//
//               });
//             } else {
//               card = doc.data();
//               //console.log("doc_data_else", doc.data());
//               //console.log("total_player in card", card['total_player']);
//               var runs_scored = card['total_player'];
//               var max_runs = card['max_runs'];
//
//               card['total_player'] = 0;
//               card['times_played'] += 1;
//               if(runs_scored > max_runs){
//                 card['max_runs'] = runs_scored;
//               }
//
//
//               var leader_board = firestore.collection('game').doc('leaderboard');
//               leader_board.get()
//               .then(doc => {
//                 if(!doc.exists){
//                   console.log('leaderboard document doesnot exist');
//                 } else {
//                   var leader_runs = doc.data();
//                   var top_1 = leader_runs['top_1'];
//                   var top_2 = leader_runs['top_2'];
//                   var top_3 = leader_runs['top_3'];
//                   if(runs_scored > top_1){
//                     firestore.collection('game').doc('leaderboard').set({'top_1': runs_scored,'top_2': top_2,'top_3': top_3})
//                     .then(() => {
//                       return console.log("leaderboard top_1 updated");
//                     })
//                     .catch((e => {
//                       console.log('error of leaderboard: ', e);
//                     }))
//                   } else if(runs_scored > top_2 && runs_scored < top_1){
//                     firestore.collection('game').doc('leaderboard').set({'top_1': top_1,'top_2': runs_scored,'top_3': top_3})
//                     .then(() => {
//                       return console.log("leaderboard top_2 updated");
//                     })
//                     .catch((e => {
//                       console.log('error of leaderboard: ', e);
//                     }))
//                   } else if(runs_scored > top_3 && runs_scored < top_2){
//                     firestore.collection('game').doc('leaderboard').set({'top_1': top_1,'top_2': top_2,'top_3': runs_scored})
//                     .then(() => {
//                       return console.log("leaderboard top_3 updated");
//                     })
//                     .catch((e => {
//                       console.log('error of leaderboard: ', e);
//                     }))
//                   }
//                 }
//                 return console.log("leaderboard else executed");
//               })
//               .catch((e => {
//                 console.log('error: ', e);
//               }))
//
//
//               firestore.collection('game').doc(userId).set(card)
//                 .then(() => {
//                   response.send({
//                     'payload': {
//                       'google': {
//                         'userStorage': JSON.stringify(userStorage),
//                         "expectUserResponse": true,
//                         "richResponse": {
//                           "items": [
//                             {
//                               "simpleResponse": {
//                                 "textToSpeech": `我们都打了 ${runs} 运行。对不起，你出去了！ \n你的总分是 ${runs_scored} 运行。`
//                               }
//                             },
//                             {
//                               "simpleResponse": {
//                                 "textToSpeech": `你想再玩一次吗？`
//                               }
//                             }
//                           ],
//                           "suggestions": [
//                             {
//                               "title": "是"
//                             },
//                             {
//                               "title": "没有"
//                             }
//                           ]
//                           // "linkOutSuggestion": {
//                           //   "destinationName": "Website",
//                           //   "url": "https://assistant.google.com"
//                           // }
//                         }
//                       }
//                     }
//
//                   });
//                   return console.log("max_runs", max_runs);
//                 })
//                 .catch((e => {
//
//                   console.log('error: ', e);
//
//                   response.send({
//                  'fulfillmentText':`something went wrong while writing to database`,
//                  'payload': {
//                    'google': {
//                      'userStorage': JSON.stringify(userStorage)
//                    }
//                  }
//
//                     });
//                 }))
//
//             }
//             return console.log("card when runs are equal", card);
//           })
//           .catch((e => {
//             console.log('error from database when runs are equal', e);
//           }));
//
//           // card['total_player'] = 0;
//           // card['times_played'] += 1;
//
//         } else {
//           card = { };
//           card['total_player'] = runs;
//           card['times_played'] = 0;
//           card['max_runs'] = 0;
//           console.log(card);
//
//           fields = firestore.collection('game').doc(userId);
//           fields.get()
//           .then( doc => {
//               if(!doc.exists){
//                 firestore.collection('game').doc(userId).set(card)
//                   .then(() => {
//                     response.send({
//                       'payload': {
//                         'google': {
//                           'userStorage': JSON.stringify(userStorage),
//                           "expectUserResponse": true,
//                           "richResponse": {
//                             "items": [
//                               {
//                                 "simpleResponse": {
//                                   "textToSpeech": `jeg slog ${ass_run} kørsler. du ramte ${runs} din samlede score er ${card['total_player']}*  \nHit den næste indkommende bold。`
//                                 }
//                               }
//                             ],
//                             "suggestions": [
//                               {
//                                 "title": "1"
//                               },
//                               {
//                                 "title": "2"
//                               },
//                               {
//                                 "title": "3"
//                               },
//                               {
//                                 "title": "4"
//                               },
//                               {
//                                 "title": "5"
//                               },
//                               {
//                                 "title": "6"
//                               }
//                             ]
//                             // "linkOutSuggestion": {
//                             //   "destinationName": "Website",
//                             //   "url": "https://assistant.google.com"
//                             // }
//                           }
//
//                         }
//                       }
//                     });
//                     return console.log("total runs in card", card);
//                   })
//                   .catch((e => {
//
//                     console.log('error: ', e);
//
//                     response.send({
//                    'fulfillmentText':`something went wrong while writing to database`,
//                    'payload': {
//                      'google': {
//                        'userStorage': JSON.stringify(userStorage)
//                      }
//                    }
//                       });
//                   }))
//
//
//               } else {
//                 card = doc.data();
//                 //console.log("doc_data_else", doc.data());
//                 //console.log("total_player in card", card['total_player']);
//                 card['total_player'] = card['total_player'] + runs;
//                 //console.log("card after adding runs", card);
//
//                 firestore.collection('game').doc(userId).set(card)
//                   .then(() => {
//                     response.send({
//                       'payload': {
//                         'google': {
//                           'userStorage': JSON.stringify(userStorage),
//                           "expectUserResponse": true,
//                           "richResponse": {
//                             "items": [
//                               {
//                                 "simpleResponse": {
//                                   "textToSpeech": `jeg slog ${ass_run} kørsler. du ramte ${runs} din samlede score er ${card['total_player']}*  \nHit den næste indkommende bold。`
//                                 }
//                               }
//                             ],
//                             "suggestions": [
//                               {
//                                 "title": "1"
//                               },
//                               {
//                                 "title": "2"
//                               },
//                               {
//                                 "title": "3"
//                               },
//                               {
//                                 "title": "4"
//                               },
//                               {
//                                 "title": "5"
//                               },
//                               {
//                                 "title": "6"
//                               }
//                             ]
//                             // "linkOutSuggestion": {
//                             //   "destinationName": "Website",
//                             //   "url": "https://assistant.google.com"
//                             // }
//                           }
//
//                         }
//                       }
//
//                     });
//
//                     // response.send({
//                     //   'fulfillmentText' : `I hit ${ass_run} runs. You hit ${runs} runs. Great! Hit the next incoming ball.`,
//                     //   'payload': {
//                     //     'google': {
//                     //       'userStorage': JSON.stringify(userStorage)
//                     //     }
//                     //   }
//                     //
//                     // });
//
//                     return console.log("total runs in card", card);
//                   })
//                   .catch((e => {
//
//                     console.log('error: ', e);
//
//                     response.send({
//                    'fulfillmentText':`something went wrong while writing to database`,
//                    'payload': {
//                      'google': {
//                        'userStorage': JSON.stringify(userStorage)
//                      }
//                    }
//                       });
//                   }))
//
//               }
//               return console.log("card when runs are not equal", card);
//             })
//           .catch((e => {
//             console.log('error from database', e);
//           }));
//
//
//           }
//         }
//
//
//
//         break;
//       }
//
//       case 'maximumruns' : {
//
//         player_data = firestore.collection('game').doc(userId);
//         player_data.get()
//         .then(doc => {
//           if(!doc.exists){
//             console.log('No such document!');
//             response.send({
//               'payload': {
//                 'google': {
//                   'userStorage': JSON.stringify(userStorage),
//                   "expectUserResponse": true,
//                   "richResponse": {
//                     "items": [
//                       {
//                         "simpleResponse": {
//                           "textToSpeech": `你的得分最多为0分。你想继续比赛吗？`
//                         }
//                       }
//                     ],
//                     "suggestions": [
//                       {
//                         "title": "是"
//                       },
//                       {
//                         "title": "没有"
//                       }
//                     ],
//                     // "linkOutSuggestion": {
//                     //   "destinationName": "Website",
//                     //   "url": "https://assistant.google.com"
//                     // }
//                   }
//                 }
//               }
//             });
//           } else {
//             var max_card = doc.data();
//             var max_runs = max_card['max_runs'];
//             var num_plays = max_card['times_played'];
//
//             response.send({
//               'payload': {
//                 'google': {
//                   'userStorage': JSON.stringify(userStorage),
//                   "expectUserResponse": true,
//                   "richResponse": {
//                     "items": [
//                       {
//                         "simpleResponse": {
//                           "textToSpeech": `你得分最高 ${max_runs} 跑进来 ${num_plays} 火柴。保持良好的发挥！`
//                         }
//                       },
//                       {
//                         "simpleResponse": {
//                           "textToSpeech": `你想继续比赛吗？`
//                         }
//                       }
//                     ],
//                     "suggestions": [
//                       {
//                         "title": "是"
//                       },
//                       {
//                         "title": "没有"
//                       }
//                     ]
//
//                   }
//                 }
//               }
//
//             });
//           }
//           return console.log("max_runs", max_runs);
//         })
//         .catch((e => {
//
//           console.log('error: ', e);
//
//           response.send({
//          'fulfillmentText':`something went wrong while writing to database`,
//          'payload': {
//            'google': {
//              'userStorage': JSON.stringify(userStorage)
//            }
//          }
//
//             });
//         }))
//
//         break;
//       }
//
//       case 'leaderboard': {
//
//         leader_board = firestore.collection('game').doc('leaderboard');
//         leader_board.get()
//         .then(doc => {
//           if(!doc.exists){
//             console.log('leaderboard document doesnot exist');
//           } else {
//             var leader_runs = doc.data();
//
//             response.send({
//               'payload': {
//                 'google': {
//                   'userStorage': JSON.stringify(userStorage),
//                   "expectUserResponse": true,
//                   "richResponse": {
//                     "items": [
//                       {
//                         "simpleResponse": {
//                           "textToSpeech": `这是排行榜`
//                         }
//                       },
//                       {
//                         "basicCard": {
//                           "title": "Voice Cricket 排行榜",
//                           "formattedText": `*1. Rajat Thakur* **${leader_runs['top_1']}**  \n*2. Vasu Bharija* **${leader_runs['top_2']}**  \n*3. Sudheer Reddy Gaddam* **${leader_runs['top_3']}**`,
//                         }
//                       },
//                       {
//                         "simpleResponse": {
//                           "textToSpeech": `你想继续比赛吗？`
//                         }
//                       }
//                     ],
//                     "suggestions": [
//                       {
//                         "title": "是"
//                       },
//                       {
//                         "title": "没有"
//                       },
//                       {
//                         "title": "我的分数"
//                       }
//                     ]
//                   }
//                 }
//               }
//
//             });
//           }
//           return console.log("leaderboard else executed");
//         })
//         .catch((e => {
//
//           console.log('error: ', e);
//
//           response.send({
//          'fulfillmentText' : `从排行榜数据库中读取时出现问题`,
//          'payload': {
//            'google': {
//              'userStorage': JSON.stringify(userStorage)
//            }
//          }
//
//             });
//         }))
//
//
//
//         break;
//       }
//
//       default: {
//
//         response.send({
//           'fulfillmentText' : `没有在webhook中匹配的操作`,
//           'payload': {
//             'google': {
//               'userStorage': JSON.stringify(userStorage)
//             }
//           }
//         });
//
//         break;
//       }
//
//     }   // switch case ending brace
//
//
//   } else if(request.body.queryResult.languageCode === "de"){     // english language else block end
//
//     switch(request.body.queryResult.action) {
//
//       case 'generatenumber' : {
//
//
//         let params = request.body.queryResult.parameters ;
//         let runs = request.body.queryResult.parameters.runs.number ;
//
//         runs = Math.floor(runs);
//         if(runs <= 0 || runs > 6){
//           response.send({
//             'payload': {
//               'google': {
//                 'userStorage': JSON.stringify(userStorage),
//                 "expectUserResponse": true,
//                 "richResponse": {
//                   "items": [
//                     {
//                       "simpleResponse": {
//                         "textToSpeech": `您只能从1次运行到6次运行。`
//                       }
//                     }
//                   ],
//                   "suggestions": [
//                     {
//                       "title": "1"
//                     },
//                     {
//                       "title": "2"
//                     },
//                     {
//                       "title": "3"
//                     },
//                     {
//                       "title": "4"
//                     },
//                     {
//                       "title": "5"
//                     },
//                     {
//                       "title": "6"
//                     }
//                   ]
//                   // "linkOutSuggestion": {
//                   //   "destinationName": "Website",
//                   //   "url": "https://assistant.google.com"
//                   // }
//                 }
//               }
//             }
//
//           })
//         } else {
//
//         ass_run = Math.floor(Math.random() * 6) + 1;
//       //console.log("card outside", card);
//
//         if(ass_run === runs){
//           card = { };
//           fields = firestore.collection('game').doc(userId);
//           fields.get()
//           .then( doc => {
//             if(!doc.exists){
//               console.log('No duch document!');
//               response.send({
//                 'payload': {
//                   'google': {
//                     'userStorage': JSON.stringify(userStorage),
//                     "expectUserResponse": true,
//                     "richResponse": {
//                       "items": [
//                         {
//                           "simpleResponse": {
//                             "textToSpeech": `我们都打了 ${runs} 运行。对不起，你出第一球！`
//                           }
//                         },
//                         {
//                           "simpleResponse": {
//                             "textToSpeech": `不幸的是，你的总分是0分。 \n你想再次竞争吗？`
//                           }
//                         }
//                       ],
//                       "suggestions": [
//                         {
//                           "title": "是"
//                         },
//                         {
//                           "title": "没有"
//                         }
//                       ]
//                       // "linkOutSuggestion": {
//                       //   "destinationName": "Website",
//                       //   "url": "https://assistant.google.com"
//                       // }
//                     }
//                   }
//                 }
//
//               });
//             } else {
//               card = doc.data();
//               //console.log("doc_data_else", doc.data());
//               //console.log("total_player in card", card['total_player']);
//               var runs_scored = card['total_player'];
//               var max_runs = card['max_runs'];
//
//               card['total_player'] = 0;
//               card['times_played'] += 1;
//               if(runs_scored > max_runs){
//                 card['max_runs'] = runs_scored;
//               }
//
//
//               var leader_board = firestore.collection('game').doc('leaderboard');
//               leader_board.get()
//               .then(doc => {
//                 if(!doc.exists){
//                   console.log('leaderboard document doesnot exist');
//                 } else {
//                   var leader_runs = doc.data();
//                   var top_1 = leader_runs['top_1'];
//                   var top_2 = leader_runs['top_2'];
//                   var top_3 = leader_runs['top_3'];
//                   if(runs_scored > top_1){
//                     firestore.collection('game').doc('leaderboard').set({'top_1': runs_scored,'top_2': top_2,'top_3': top_3})
//                     .then(() => {
//                       return console.log("leaderboard top_1 updated");
//                     })
//                     .catch((e => {
//                       console.log('error of leaderboard: ', e);
//                     }))
//                   } else if(runs_scored > top_2 && runs_scored < top_1){
//                     firestore.collection('game').doc('leaderboard').set({'top_1': top_1,'top_2': runs_scored,'top_3': top_3})
//                     .then(() => {
//                       return console.log("leaderboard top_2 updated");
//                     })
//                     .catch((e => {
//                       console.log('error of leaderboard: ', e);
//                     }))
//                   } else if(runs_scored > top_3 && runs_scored < top_2){
//                     firestore.collection('game').doc('leaderboard').set({'top_1': top_1,'top_2': top_2,'top_3': runs_scored})
//                     .then(() => {
//                       return console.log("leaderboard top_3 updated");
//                     })
//                     .catch((e => {
//                       console.log('error of leaderboard: ', e);
//                     }))
//                   }
//                 }
//                 return console.log("leaderboard else executed");
//               })
//               .catch((e => {
//                 console.log('error: ', e);
//               }))
//
//
//               firestore.collection('game').doc(userId).set(card)
//                 .then(() => {
//                   response.send({
//                     'payload': {
//                       'google': {
//                         'userStorage': JSON.stringify(userStorage),
//                         "expectUserResponse": true,
//                         "richResponse": {
//                           "items": [
//                             {
//                               "simpleResponse": {
//                                 "textToSpeech": `我们都打了 ${runs} 运行。对不起，你出去了！ \n你的总分是 ${runs_scored} 运行。`
//                               }
//                             },
//                             {
//                               "simpleResponse": {
//                                 "textToSpeech": `你想再玩一次吗？`
//                               }
//                             }
//                           ],
//                           "suggestions": [
//                             {
//                               "title": "是"
//                             },
//                             {
//                               "title": "没有"
//                             }
//                           ]
//                           // "linkOutSuggestion": {
//                           //   "destinationName": "Website",
//                           //   "url": "https://assistant.google.com"
//                           // }
//                         }
//                       }
//                     }
//
//                   });
//                   return console.log("max_runs", max_runs);
//                 })
//                 .catch((e => {
//
//                   console.log('error: ', e);
//
//                   response.send({
//                  'fulfillmentText':`something went wrong while writing to database`,
//                  'payload': {
//                    'google': {
//                      'userStorage': JSON.stringify(userStorage)
//                    }
//                  }
//
//                     });
//                 }))
//
//             }
//             return console.log("card when runs are equal", card);
//           })
//           .catch((e => {
//             console.log('error from database when runs are equal', e);
//           }));
//
//           // card['total_player'] = 0;
//           // card['times_played'] += 1;
//
//         } else {
//           card = { };
//           card['total_player'] = runs;
//           card['times_played'] = 0;
//           card['max_runs'] = 0;
//           console.log(card);
//
//           fields = firestore.collection('game').doc(userId);
//           fields.get()
//           .then( doc => {
//               if(!doc.exists){
//                 firestore.collection('game').doc(userId).set(card)
//                   .then(() => {
//                     response.send({
//                       'payload': {
//                         'google': {
//                           'userStorage': JSON.stringify(userStorage),
//                           "expectUserResponse": true,
//                           "richResponse": {
//                             "items": [
//                               {
//                                 "simpleResponse": {
//                                   "textToSpeech": `golpee ${ass_run} carreras. Tu golpeas ${runs} carreras. Su puntaje total es ${card['total_player']}*  \nGolpea la próxima bola entrante`
//                                 }
//                               }
//                             ],
//                             "suggestions": [
//                               {
//                                 "title": "1"
//                               },
//                               {
//                                 "title": "2"
//                               },
//                               {
//                                 "title": "3"
//                               },
//                               {
//                                 "title": "4"
//                               },
//                               {
//                                 "title": "5"
//                               },
//                               {
//                                 "title": "6"
//                               }
//                             ]
//                             // "linkOutSuggestion": {
//                             //   "destinationName": "Website",
//                             //   "url": "https://assistant.google.com"
//                             // }
//                           }
//
//                         }
//                       }
//                     });
//                     return console.log("total runs in card", card);
//                   })
//                   .catch((e => {
//
//                     console.log('error: ', e);
//
//                     response.send({
//                    'fulfillmentText':`something went wrong while writing to database`,
//                    'payload': {
//                      'google': {
//                        'userStorage': JSON.stringify(userStorage)
//                      }
//                    }
//                       });
//                   }))
//
//
//               } else {
//                 card = doc.data();
//                 //console.log("doc_data_else", doc.data());
//                 //console.log("total_player in card", card['total_player']);
//                 card['total_player'] = card['total_player'] + runs;
//                 //console.log("card after adding runs", card);
//
//                 firestore.collection('game').doc(userId).set(card)
//                   .then(() => {
//                     response.send({
//                       'payload': {
//                         'google': {
//                           'userStorage': JSON.stringify(userStorage),
//                           "expectUserResponse": true,
//                           "richResponse": {
//                             "items": [
//                               {
//                                 "simpleResponse": {
//                                   "textToSpeech": `golpee ${ass_run} carreras. Tu golpeas ${runs} carreras. Su puntaje total es ${card['total_player']}*  \nGolpea la próxima bola entrante`
//                                 }
//                               }
//                             ],
//                             "suggestions": [
//                               {
//                                 "title": "1"
//                               },
//                               {
//                                 "title": "2"
//                               },
//                               {
//                                 "title": "3"
//                               },
//                               {
//                                 "title": "4"
//                               },
//                               {
//                                 "title": "5"
//                               },
//                               {
//                                 "title": "6"
//                               }
//                             ]
//                             // "linkOutSuggestion": {
//                             //   "destinationName": "Website",
//                             //   "url": "https://assistant.google.com"
//                             // }
//                           }
//
//                         }
//                       }
//
//                     });
//
//                     // response.send({
//                     //   'fulfillmentText' : `I hit ${ass_run} runs. You hit ${runs} runs. Great! Hit the next incoming ball.`,
//                     //   'payload': {
//                     //     'google': {
//                     //       'userStorage': JSON.stringify(userStorage)
//                     //     }
//                     //   }
//                     //
//                     // });
//
//                     return console.log("total runs in card", card);
//                   })
//                   .catch((e => {
//
//                     console.log('error: ', e);
//
//                     response.send({
//                    'fulfillmentText':`something went wrong while writing to database`,
//                    'payload': {
//                      'google': {
//                        'userStorage': JSON.stringify(userStorage)
//                      }
//                    }
//                       });
//                   }))
//
//               }
//               return console.log("card when runs are not equal", card);
//             })
//           .catch((e => {
//             console.log('error from database', e);
//           }));
//
//
//           }
//         }
//
//
//
//         break;
//       }
//
//       case 'maximumruns' : {
//
//         player_data = firestore.collection('game').doc(userId);
//         player_data.get()
//         .then(doc => {
//           if(!doc.exists){
//             console.log('No such document!');
//             response.send({
//               'payload': {
//                 'google': {
//                   'userStorage': JSON.stringify(userStorage),
//                   "expectUserResponse": true,
//                   "richResponse": {
//                     "items": [
//                       {
//                         "simpleResponse": {
//                           "textToSpeech": `你的得分最多为0分。你想继续比赛吗？`
//                         }
//                       }
//                     ],
//                     "suggestions": [
//                       {
//                         "title": "是"
//                       },
//                       {
//                         "title": "没有"
//                       }
//                     ],
//                     // "linkOutSuggestion": {
//                     //   "destinationName": "Website",
//                     //   "url": "https://assistant.google.com"
//                     // }
//                   }
//                 }
//               }
//             });
//           } else {
//             var max_card = doc.data();
//             var max_runs = max_card['max_runs'];
//             var num_plays = max_card['times_played'];
//
//             response.send({
//               'payload': {
//                 'google': {
//                   'userStorage': JSON.stringify(userStorage),
//                   "expectUserResponse": true,
//                   "richResponse": {
//                     "items": [
//                       {
//                         "simpleResponse": {
//                           "textToSpeech": `你得分最高 ${max_runs} 跑进来 ${num_plays} 火柴。保持良好的发挥！`
//                         }
//                       },
//                       {
//                         "simpleResponse": {
//                           "textToSpeech": `你想继续比赛吗？`
//                         }
//                       }
//                     ],
//                     "suggestions": [
//                       {
//                         "title": "是"
//                       },
//                       {
//                         "title": "没有"
//                       }
//                     ]
//
//                   }
//                 }
//               }
//
//             });
//           }
//           return console.log("max_runs", max_runs);
//         })
//         .catch((e => {
//
//           console.log('error: ', e);
//
//           response.send({
//          'fulfillmentText':`something went wrong while writing to database`,
//          'payload': {
//            'google': {
//              'userStorage': JSON.stringify(userStorage)
//            }
//          }
//
//             });
//         }))
//
//         break;
//       }
//
//       case 'leaderboard': {
//
//         leader_board = firestore.collection('game').doc('leaderboard');
//         leader_board.get()
//         .then(doc => {
//           if(!doc.exists){
//             console.log('leaderboard document doesnot exist');
//           } else {
//             var leader_runs = doc.data();
//
//             response.send({
//               'payload': {
//                 'google': {
//                   'userStorage': JSON.stringify(userStorage),
//                   "expectUserResponse": true,
//                   "richResponse": {
//                     "items": [
//                       {
//                         "simpleResponse": {
//                           "textToSpeech": `这是排行榜`
//                         }
//                       },
//                       {
//                         "basicCard": {
//                           "title": "Voice Cricket 排行榜",
//                           "formattedText": `*1. Rajat Thakur* **${leader_runs['top_1']}**  \n*2. Vasu Bharija* **${leader_runs['top_2']}**  \n*3. Sudheer Reddy Gaddam* **${leader_runs['top_3']}**`,
//                         }
//                       },
//                       {
//                         "simpleResponse": {
//                           "textToSpeech": `你想继续比赛吗？`
//                         }
//                       }
//                     ],
//                     "suggestions": [
//                       {
//                         "title": "是"
//                       },
//                       {
//                         "title": "没有"
//                       },
//                       {
//                         "title": "我的分数"
//                       }
//                     ]
//                   }
//                 }
//               }
//
//             });
//           }
//           return console.log("leaderboard else executed");
//         })
//         .catch((e => {
//
//           console.log('error: ', e);
//
//           response.send({
//          'fulfillmentText' : `从排行榜数据库中读取时出现问题`,
//          'payload': {
//            'google': {
//              'userStorage': JSON.stringify(userStorage)
//            }
//          }
//
//             });
//         }))
//
//
//
//         break;
//       }
//
//       default: {
//
//         response.send({
//           'fulfillmentText' : `没有在webhook中匹配的操作`,
//           'payload': {
//             'google': {
//               'userStorage': JSON.stringify(userStorage)
//             }
//           }
//         });
//
//         break;
//       }
//
//     }   // switch case ending brace
//
//
//   } else {
//   switch(request.body.queryResult.action) {
//
//     case 'generatenumber' : {
//
//
//       let params = request.body.queryResult.parameters ;
//       let runs = request.body.queryResult.parameters.runs.number ;
//
//       runs = Math.floor(runs);
//       if(runs <= 0 || runs > 6){
//         response.send({
//           'fulfillmentText':`You can only hit from 1 run to 6 runs.`,
//           'payload': {
//             'google': {
//               'userStorage': JSON.stringify(userStorage),
//               "expectUserResponse": true,
//               "richResponse": {
//                 "items": [
//                   {
//                     "simpleResponse": {
//                       "textToSpeech": `You can only hit from 1 run to 6 runs.`
//                     }
//                   }
//                 ],
//                 "suggestions": [
//                   {
//                     "title": "1"
//                   },
//                   {
//                     "title": "2"
//                   },
//                   {
//                     "title": "3"
//                   },
//                   {
//                     "title": "4"
//                   },
//                   {
//                     "title": "5"
//                   },
//                   {
//                     "title": "6"
//                   }
//                 ]
//                 // "linkOutSuggestion": {
//                 //   "destinationName": "Website",
//                 //   "url": "https://assistant.google.com"
//                 // }
//               }
//             }
//           }
//
//         })
//       } else {
//
//       var ass_run = Math.floor(Math.random() * 6) + 1;
//     //console.log("card outside", card);
//
//       if(ass_run === runs){
//         var card = { };
//         var fields = firestore.collection('game').doc(userId);
//         fields.get()
//         .then( doc => {
//           if(!doc.exists){
//             console.log('No duch document!');
//             response.send({
//               'fulfillmentText':`We both hit ${runs} runs. Sorry, You're out on the first ball!  \nUnluckily, Your total score is 0 run.  \nWould you like to compete again?`,
//               'payload': {
//                 'google': {
//                   'userStorage': JSON.stringify(userStorage),
//                   "expectUserResponse": true,
//                   "richResponse": {
//                     "items": [
//                       {
//                         "simpleResponse": {
//                           "textToSpeech": `We both hit ${runs} runs. Sorry, You're out on the first ball!`
//                         }
//                       },
//                       {
//                         "simpleResponse": {
//                           "textToSpeech": `Unluckily, Your total score is 0 run.  \nWould you like to compete again?`
//                         }
//                       }
//                     ],
//                     "suggestions": [
//                       {
//                         "title": "yes"
//                       },
//                       {
//                         "title": "no"
//                       }
//                     ]
//                     // "linkOutSuggestion": {
//                     //   "destinationName": "Website",
//                     //   "url": "https://assistant.google.com"
//                     // }
//                   }
//                 }
//               }
//
//             });
//           } else {
//             card = doc.data();
//             //console.log("doc_data_else", doc.data());
//             //console.log("total_player in card", card['total_player']);
//             var runs_scored = card['total_player'];
//             var max_runs = card['max_runs'];
//
//             card['total_player'] = 0;
//             card['times_played'] += 1;
//             if(runs_scored > max_runs){
//               card['max_runs'] = runs_scored;
//             }
//
//
//             var leader_board = firestore.collection('game').doc('leaderboard');
//             leader_board.get()
//             .then(doc => {
//               if(!doc.exists){
//                 console.log('leaderboard document doesnot exist');
//               } else {
//                 var leader_runs = doc.data();
//                 var top_1 = leader_runs['top_1'];
//                 var top_2 = leader_runs['top_2'];
//                 var top_3 = leader_runs['top_3'];
//                 if(runs_scored > top_1){
//                   firestore.collection('game').doc('leaderboard').set({'top_1': runs_scored,'top_2': top_2,'top_3': top_3})
//                   .then(() => {
//                     return console.log("leaderboard top_1 updated");
//                   })
//                   .catch((e => {
//                     console.log('error of leaderboard: ', e);
//                   }))
//                 } else if(runs_scored > top_2 && runs_scored < top_1){
//                   firestore.collection('game').doc('leaderboard').set({'top_1': top_1,'top_2': runs_scored,'top_3': top_3})
//                   .then(() => {
//                     return console.log("leaderboard top_2 updated");
//                   })
//                   .catch((e => {
//                     console.log('error of leaderboard: ', e);
//                   }))
//                 } else if(runs_scored > top_3 && runs_scored < top_2){
//                   firestore.collection('game').doc('leaderboard').set({'top_1': top_1,'top_2': top_2,'top_3': runs_scored})
//                   .then(() => {
//                     return console.log("leaderboard top_3 updated");
//                   })
//                   .catch((e => {
//                     console.log('error of leaderboard: ', e);
//                   }))
//                 }
//               }
//               return console.log("leaderboard else executed");
//             })
//             .catch((e => {
//               console.log('error: ', e);
//             }))
//
//             firestore.collection('game').doc(userId).set(card)
//               .then(() => {
//                 response.send({
//                   'fulfillmentText':`We both hit ${runs} runs. Sorry, You're out!  \nYour total score is ${runs_scored} runs.  \nWould you like play again?`,
//                   'payload': {
//                     'google': {
//                       'userStorage': JSON.stringify(userStorage),
//                       "expectUserResponse": true,
//                       "richResponse": {
//                         "items": [
//                           {
//                             "simpleResponse": {
//                               "textToSpeech": `We both hit ${runs} runs. Sorry, You're out!  \nYour total score is ${runs_scored} runs.`
//                             }
//                           },
//                           {
//                             "simpleResponse": {
//                               "textToSpeech": `Would you like play again?`
//                             }
//                           }
//                         ],
//                         "suggestions": [
//                           {
//                             "title": "yes"
//                           },
//                           {
//                             "title": "no"
//                           },
//                           {
//                             "title": "My Score"
//                           },
//                           {
//                             "title": "Leaderboard"
//                           }
//                         ]
//                         // "linkOutSuggestion": {
//                         //   "destinationName": "Website",
//                         //   "url": "https://assistant.google.com"
//                         // }
//                       }
//                     }
//                   }
//
//                 });
//                 return console.log("max_runs", max_runs);
//               })
//               .catch((e => {
//
//                 console.log('error: ', e);
//
//                 response.send({
//                'fulfillmentText' : `something went wrong when writing to database`,
//                'payload': {
//                  'google': {
//                    'userStorage': JSON.stringify(userStorage)
//                  }
//                }
//
//                   });
//               }))
//
//           }
//           return console.log("card when runs are equal", card);
//         })
//         .catch((e => {
//           console.log('error from database when runs are equal', e);
//         }));
//
//         // card['total_player'] = 0;
//         // card['times_played'] += 1;
//
//       } else {
//         card = { };
//         card['total_player'] = runs;
//         card['times_played'] = 0;
//         card['max_runs'] = 0;
//         console.log(card);
//
//         fields = firestore.collection('game').doc(userId);
//         fields.get()
//         .then( doc => {
//             if(!doc.exists){
//               firestore.collection('game').doc(userId).set(card)
//                 .then(() => {
//                   response.send({
//                     'fulfillmentText': `I hit ${ass_run} runs. You hit ${runs} runs. Your total score is ${card['total_player']}*  \nGreat! Hit the next incoming ball.`,
//                     'payload': {
//                       'google': {
//                         'userStorage': JSON.stringify(userStorage),
//                         "expectUserResponse": true,
//                         "richResponse": {
//                           "items": [
//                             {
//                               "simpleResponse": {
//                                 "textToSpeech": `I hit ${ass_run} runs. You hit ${runs} runs. Your total score is ${card['total_player']}*  \nGreat! Hit the next incoming ball.`
//                               }
//                             }
//                           ],
//                           "suggestions": [
//                             {
//                               "title": "1"
//                             },
//                             {
//                               "title": "2"
//                             },
//                             {
//                               "title": "3"
//                             },
//                             {
//                               "title": "4"
//                             },
//                             {
//                               "title": "5"
//                             },
//                             {
//                               "title": "6"
//                             }
//                           ]
//                           // "linkOutSuggestion": {
//                           //   "destinationName": "Website",
//                           //   "url": "https://assistant.google.com"
//                           // }
//                         }
//
//                       }
//                     }
//                   });
//                   return console.log("total runs in card", card);
//                 })
//                 .catch((e => {
//
//                   console.log('error: ', e);
//
//                   response.send({
//                  'fulfillmentText' : `something went wrong when writing to database`,
//                  'payload': {
//                    'google': {
//                      'userStorage': JSON.stringify(userStorage)
//                    }
//                  }
//                     });
//                 }))
//
//
//             } else {
//               card = doc.data();
//               //console.log("doc_data_else", doc.data());
//               //console.log("total_player in card", card['total_player']);
//               card['total_player'] = card['total_player'] + runs;
//               //console.log("card after adding runs", card);
//
//               firestore.collection('game').doc(userId).set(card)
//                 .then(() => {
//                   response.send({
//                     'fulfillmentText':`I hit ${ass_run} runs. You hit ${runs} runs. Your total score is ${card['total_player']}*  \nGreat! Hit the next incoming ball.`,
//                     'payload': {
//                       'google': {
//                         'userStorage': JSON.stringify(userStorage),
//                         "expectUserResponse": true,
//                         "richResponse": {
//                           "items": [
//                             {
//                               "simpleResponse": {
//                                 "textToSpeech": `I hit ${ass_run} runs. You hit ${runs} runs. Your total score is ${card['total_player']}*  \nGreat! Hit the next incoming ball.`
//                               }
//                             }
//                           ],
//                           "suggestions": [
//                             {
//                               "title": "1"
//                             },
//                             {
//                               "title": "2"
//                             },
//                             {
//                               "title": "3"
//                             },
//                             {
//                               "title": "4"
//                             },
//                             {
//                               "title": "5"
//                             },
//                             {
//                               "title": "6"
//                             }
//                           ]
//                           // "linkOutSuggestion": {
//                           //   "destinationName": "Website",
//                           //   "url": "https://assistant.google.com"
//                           // }
//                         }
//
//                       }
//                     }
//
//                   });
//
//                   // response.send({
//                   //   'fulfillmentText' : `I hit ${ass_run} runs. You hit ${runs} runs. Great! Hit the next incoming ball.`,
//                   //   'payload': {
//                   //     'google': {
//                   //       'userStorage': JSON.stringify(userStorage)
//                   //     }
//                   //   }
//                   //
//                   // });
//
//                   return console.log("total runs in card", card);
//                 })
//                 .catch((e => {
//
//                   console.log('error: ', e);
//
//                   response.send({
//                  'fulfillmentText' : `something went wrong when writing to database`,
//                  'payload': {
//                    'google': {
//                      'userStorage': JSON.stringify(userStorage)
//                    }
//                  }
//                     });
//                 }))
//
//             }
//             return console.log("card when runs are not equal", card);
//           })
//         .catch((e => {
//           console.log('error from database', e);
//         }));
//
//
//         }
//       }
//
//
//
//       break;
//     }
//
//     case 'maximumruns' : {
//
//       var player_data = firestore.collection('game').doc(userId);
//       player_data.get()
//       .then(doc => {
//         if(!doc.exists){
//           console.log('No such document!');
//           response.send({
//             'fulfillmentText': `You have scored a maximum of 0 run. Would you like to continue the game?`,
//             'payload': {
//               'google': {
//                 'userStorage': JSON.stringify(userStorage),
//                 "expectUserResponse": true,
//                 "richResponse": {
//                   "items": [
//                     {
//                       "simpleResponse": {
//                         "textToSpeech": `You have scored a maximum of 0 run. Would you like to continue the game?`
//                       }
//                     }
//                   ],
//                   "suggestions": [
//                     {
//                       "title": "yes"
//                     },
//                     {
//                       "title": "no"
//                     },
//                     {
//                       "title": "Leaderboard"
//                     }
//                   ],
//                   // "linkOutSuggestion": {
//                   //   "destinationName": "Website",
//                   //   "url": "https://assistant.google.com"
//                   // }
//                 }
//               }
//             }
//           });
//         } else {
//           var max_card = doc.data();
//           var max_runs = max_card['max_runs'];
//           var num_plays = max_card['times_played'];
//
//           response.send({
//             'fulfillmentText': `You have scored a maximum of ${max_runs} runs in ${num_plays} matches. Keep up the good play!  \nWould you like to continue the game?`,
//             'payload': {
//               'google': {
//                 'userStorage': JSON.stringify(userStorage),
//                 "expectUserResponse": true,
//                 "richResponse": {
//                   "items": [
//                     {
//                       "simpleResponse": {
//                         "textToSpeech": `You have scored a maximum of ${max_runs} runs in ${num_plays} matches. Keep up the good play!`
//                       }
//                     },
//                     {
//                       "simpleResponse": {
//                         "textToSpeech": `Would you like to continue the game?`
//                       }
//                     }
//                   ],
//                   "suggestions": [
//                     {
//                       "title": "yes"
//                     },
//                     {
//                       "title": "no"
//                     },
//                     {
//                       "title": "Leaderboard"
//                     }
//                   ]
//
//                 }
//               }
//             }
//
//           });
//         }
//         return console.log("max_runs", max_runs);
//       })
//       .catch((e => {
//
//         console.log('error: ', e);
//
//         response.send({
//        'fulfillmentText' : `something went wrong when writing to database`,
//        'payload': {
//          'google': {
//            'userStorage': JSON.stringify(userStorage)
//          }
//        }
//
//           });
//       }))
//
//       break;
//     }
//
//     case 'leaderboard': {
//
//       var leader_board = firestore.collection('game').doc('leaderboard');
//       leader_board.get()
//       .then(doc => {
//         if(!doc.exists){
//           console.log('leaderboard document doesnot exist');
//         } else {
//           var leader_runs = doc.data();
//
//           response.send({
//             'fulfillmentText': `Voice Cricket Leaderboard  \n1. Rajat Thakur ${leader_runs['top_1']}  \n2. Vasu Verma ${leader_runs['top_2']}  \n3. Sudheer Reddy Gaddam ${leader_runs['top_3']}  \nWould you like to continue the play?`,
//             'payload': {
//               'google': {
//                 'userStorage': JSON.stringify(userStorage),
//                 "expectUserResponse": true,
//                 "richResponse": {
//                   "items": [
//                     {
//                       "simpleResponse": {
//                         "textToSpeech": `Here's the Leaderboard`
//                       }
//                     },
//                     {
//                       "basicCard": {
//                         "title": "Voice Cricket Leaderboard",
//                         "formattedText": `*1. Rajat Thakur* **${leader_runs['top_1']}**  \n*2. Vasu Verma* **${leader_runs['top_2']}**  \n*3. Sudheer Reddy Gaddam* **${leader_runs['top_3']}**`,
//                       }
//                     },
//                     {
//                       "simpleResponse": {
//                         "textToSpeech": `Would you like to continue the play?`
//                       }
//                     }
//                   ],
//                   "suggestions": [
//                     {
//                       "title": "yes"
//                     },
//                     {
//                       "title": "no"
//                     },
//                     {
//                       "title": "My Score"
//                     }
//                   ]
//                 }
//               }
//             }
//
//           });
//         }
//         return console.log("leaderboard else executed");
//       })
//       .catch((e => {
//
//         console.log('error: ', e);
//
//         response.send({
//        'fulfillmentText' : `something went wrong when reading from the leaderboard database`,
//        'payload': {
//          'google': {
//            'userStorage': JSON.stringify(userStorage)
//          }
//        }
//
//           });
//       }))
//
//       break;
//     }
//
//     default: {
//
//       response.send({
//         'fulfillmentText' : `no action matched in webhook`,
//         'payload': {
//           'google': {
//             'userStorage': JSON.stringify(userStorage)
//           }
//         }
//       });
//
//       break;
//     }
//
//   }   // switch case ending brace
//
// }
//
// });
