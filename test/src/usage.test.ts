import validatorFV from '../../src/index';
import routing from '@novice1/routing';
import { expect } from 'chai';

describe('Set validator', () => {

  const router = routing()
    .setValidators(validatorFV({
      plugins: [
        // Plugin Side
        function myPlugin(validator) {
          validator.alias('username', {
            type: 'string',
            min: 4,
            max: 30
          })
        }
      ]
    }))
    .post({
      path: '/post',
      name: 'Post',
      description: 'Post a comment',
      tags: 'Comments'
    }, function postToDo(req, res) {
      res.json(req.meta)
    });

  it('should have registered \'post\' route with the validator middleware', function () {
    expect(router.stack[0].route.path).to.equal('/post');

    expect(router.stack[0].route.stack[1].type)
      .to.eql('validator');

    expect(router.stack[0].route.stack[1].name)
      .to.eql('validatorFVRequestHandler');
  });
});
