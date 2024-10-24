// /**
//  Module: util_WT
//  Author: 820491047
//  CreateDate:   2023.1.10
//  UpDateDate:   2023.1.10
//  version 0.0.0
// */
// import { valid } from "./util_JS";


// /**worth ,worth high means good,low means bad*/
// export interface WT {
// 	w: number;
// 	increase(n: number): void;
// 	trade(wt: WT, n: number): void;
// 	into(wt: WT, n: number): void;
// 	into_p(wt: WT, n: number): void;
// 	getFrom(wt: WT, n: number): void;
// }
// /**the class of WT*/
// export class WT_C implements WT {
// 	w: number;
// 	constructor(w: number, wt?: WT) {
// 		if (wt) {
// 			this.w = 0;
// 			wt.into(this, w);
// 		} else {
// 			this.w = w;
// 		}
// 	}
// 	/**increase the worth*/
// 	increase(n: number) {
// 		if (isNaN(n)) return;
// 		else {
// 			this.w += n;
// 		}
// 	}
// 	/**transfer worth to another WT*/
// 	private trade_basic(wt: WT, n: number) {
// 		wt.increase(n);
// 		this.increase(-n);
// 	}
// 	/**transfer worth to another WT,not allow negative value of worth in WT after transfer*/
// 	trade(wt: WT, n: number) {
// 		if (wt.w < -n) {
// 			n = -wt.w;
// 		} else if (this.w < n) {
// 			n = this.w;
// 		}
// 		this.trade_basic(wt, n);
// 	}
// 	/**transfer worth to another WT,
// 	 * not allow negative value of worth in WT after transfer
// 	 * and not aloow negative delta worth*/
// 	into(wt: WT, n: number) {
// 		if (n <= 0) return;
// 		else this.trade(wt, n);
// 	}
// 	/**into n*this.w of worth,n is from 0 to 1*/
// 	into_p(wt: WT, n: number) {
// 		this.into(wt, this.w * n);
// 	}
// 	/**obverse of into*/
// 	getFrom(wt: WT, n: number) {
// 		wt.into(this, n);
// 	}
// }
// /**create a WT by worth from another WT*/
// export function w(wt: WT, n?: number): WT_C {
// 	if (valid(n)) {
// 		return new WT_C(<number>n, wt);
// 	} else {
// 		return new WT_C(wt.w, wt);
// 	}
// }
// /**create a WT*/
// export function wc(n: number): WT_C {
// 	return new WT_C(n);
// }
// /**a type*/
// export type Comb_WT<E> = {
// 	data: E;
// 	wt: WT;
// };
// /**used to select or decide a value by the worth of WTs*/
// export class Selecter<E> {
// 	datas: Comb_WT<E>[];
// 	constructor(data: E, wt: WT) {
// 		this.datas = [{ data: data, wt: wt }];
// 	}
// 	private addByComb(comb: Comb_WT<E>) {
// 		this.datas.push(comb);
// 	}
// 	/**if same data,increase the WT instead of add a new one*/
// 	add(comb: Comb_WT<E>) {
// 		const oldData: Comb_WT<E> | undefined = this.datas.find(
// 			i => i.data === comb.data
// 		);
// 		if (oldData) {
// 			comb.wt.into_p(oldData.wt, 1);
// 		} else {
// 			this.addByComb(comb)
// 		}
// 	}
// 	/**select the max worth*/
// 	select_max(): Comb_WT<E> {
// 		return this.datas.reduce((a, b) => (a.wt.w > b.wt.w ? a : b));
// 	}
// }
