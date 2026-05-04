import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import ParishBoundaries from "../../../app/components/parish-boundaries.js";

module('Integration | Component | parish-boundaries', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(<template><ParishBoundaries /></template>);

    assert.equal(this.element.textContent.trim(), '');

    // Template block usage:
    await render(<template>
      <ParishBoundaries>
        template block text
      </ParishBoundaries>
    </template>);

    assert.equal(this.element.textContent.trim(), 'template block text');
  });
});
