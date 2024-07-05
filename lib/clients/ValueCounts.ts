// @deno-types="../deps/mosaic-core.d.ts";
import { MosaicClient, type Selection } from "@uwdata/mosaic-core";
// @deno-types="../deps/mosaic-sql.d.ts";
import {
	column,
	count,
	Query,
	sql,
	SQLExpression,
	sum,
} from "@uwdata/mosaic-sql";
import type * as arrow from "apache-arrow";

import { ValueCountsPlot } from "../utils/ValueCountsPlot.ts";

interface UniqueValuesOptions {
	/** The table to query. */
	table: string;
	/** The column to use for the histogram. */
	column: string;
	/** A mosaic selection to filter the data. */
	filterBy?: Selection;
}

export class ValueCounts extends MosaicClient {
	#table: string;
	#column: string;
	#el: HTMLElement = document.createElement("div");
	#plot: HTMLElement | undefined;

	constructor(options: UniqueValuesOptions) {
		super(options.filterBy);
		this.#table = options.table;
		this.#column = options.column;
	}

	query(filter: Array<SQLExpression>): Query {
		let valueCounts = Query
			.select({
				value: sql`CASE
					WHEN ${column(this.#column)} IS NULL THEN '__quak_null__'
					ELSE ${column(this.#column)}
				END`,
				count: count(),
			})
			.from(this.#table)
			.where(filter)
			.groupby("value");
		return Query
			.with({ value_counts: valueCounts })
			.select(
				{
					key: sql`CASE
						WHEN "count" = 1 AND "value" != '__quak_null__' THEN '__quak_unique__'
						ELSE "value"
					END`,
					total: sum("count"),
				},
			)
			.from("value_counts")
			.groupby("key");
	}

	queryResult(
		data: arrow.Table<{ key: arrow.Utf8; total: arrow.Int }>, // type comes from the query above
	): this {
		if (!this.#plot) {
			this.#plot = ValueCountsPlot(data);
			this.#el.appendChild(this.#plot);
		}
		return this;
	}

	get plot() {
		return {
			node: () => this.#el,
		};
	}
}