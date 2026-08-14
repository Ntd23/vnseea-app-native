const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('map Page backend ranking contract', () => {
  it('ranks nationwide Page candidates by name before LIMIT and distance', () => {
    const backend = read('phtml/api/v2/endpoints/map_discovery.php');
    const pageSearch = backend.slice(
      backend.indexOf('function Wo_ApiMapDiscoveryPageSuggestions()'),
      backend.indexOf('function Wo_ApiMapDiscoveryAddPrediction'),
    );

    expect(pageSearch).toContain(
      '$distance_order = ($has_origin && !$global_search)',
    );
    expect(pageSearch).toContain(
      'usort($items, function($a, $b)',
    );
    expect(pageSearch).toContain('$name_contains_order =');
    expect(pageSearch).toContain('$ordered_token_pattern =');
    expect(pageSearch).not.toContain('$legacy_token_clauses = array();');
    expect(pageSearch).toContain('$query_tokens = array_slice(');
    expect(pageSearch).toContain("CONCAT_WS(' ',");
    expect(pageSearch).not.toContain('if (strlen($query_token) < 2)');
    expect(pageSearch).toContain("'(^|[^[:alnum:]])'");
    expect(pageSearch).toContain("'([^[:alnum:]]|$)'");
    expect(pageSearch).toContain("REGEXP '{$token_boundary_pattern}'");
    expect(pageSearch).not.toContain(
      "{$combined_name_expression} LIKE '%{$escaped_token}%'",
    );
    expect(pageSearch).toContain('$all_name_tokens_match = count($query_tokens) > 1;');
    expect(pageSearch).toContain('$global_name_search_where =');

    const globalNameStart = pageSearch.indexOf('$global_name_search_where =');
    const globalNameEnd = pageSearch.indexOf(
      '$legacy_search_where =',
      globalNameStart,
    );
    const globalNameBlock = pageSearch.slice(globalNameStart, globalNameEnd);
    expect(globalNameBlock).not.toContain('`address`');

    const sqlOrderStart = pageSearch.indexOf('$name_order =');
    const nameContainsOrder = pageSearch.indexOf('$name_contains_order =');
    const sqlLimit = pageSearch.indexOf('LIMIT {$candidate_limit}');
    expect(nameContainsOrder).toBeGreaterThan(-1);
    expect(nameContainsOrder).toBeLessThan(sqlOrderStart);
    expect(sqlOrderStart).toBeLessThan(sqlLimit);
    expect(pageSearch.slice(sqlOrderStart, sqlLimit)).toContain(
      '$name_contains_order',
    );

    const sortStart = pageSearch.indexOf('usort($items');
    const priorityTieBreak = pageSearch.indexOf(
      '$a_match_priority !== $b_match_priority',
      sortStart,
    );
    const distanceTieBreak = pageSearch.indexOf('$a_near =', sortStart);

    expect(priorityTieBreak).toBeGreaterThan(sortStart);
    expect(distanceTieBreak).toBeGreaterThan(priorityTieBreak);
  });
});
